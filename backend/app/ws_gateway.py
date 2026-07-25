"""
Kognit Backend — WebSocket Gateway

Concurrency model:
  - Per-session asyncio.Lock: only one AI turn (LLM + TTS) runs at a time.
  - Code-edit triggers are dropped if a turn is already active.
  - Voice questions always wait for the lock — never dropped.
  - Barge-in: a 'barge_in' event from the frontend cancels the active turn
    immediately and starts a fresh voice turn.
"""

from __future__ import annotations

import json
import asyncio
import base64
from fastapi import WebSocket, WebSocketDisconnect

from app.session_store import (
    get_session, add_message, update_code_snapshot, set_last_error,
)
from app.code_analyzer import analyze_code_stream
from app.tts_service import text_to_speech, audio_to_base64, stream_tts_to_ws
from app.stt_service import transcribe_audio
from app.auth import get_current_user_ws
from app.database import AsyncSessionLocal
from app.models import ArenaSession
from sqlalchemy import update
from datetime import datetime, timezone


# ── Per-session state ─────────────────────────────────────────────────
_active_connections: dict[str, WebSocket] = {}
_analysis_tasks: dict[str, asyncio.Task] = {}
_turn_locks: dict[str, asyncio.Lock] = {}
_barge_in_flags: dict[str, asyncio.Event] = {}

CODE_ANALYSIS_DEBOUNCE = 5.0  # seconds


def _get_turn_lock(session_id: str) -> asyncio.Lock:
    if session_id not in _turn_locks:
        _turn_locks[session_id] = asyncio.Lock()
    return _turn_locks[session_id]


def _get_barge_in(session_id: str) -> asyncio.Event:
    if session_id not in _barge_in_flags:
        _barge_in_flags[session_id] = asyncio.Event()
    return _barge_in_flags[session_id]


# ── WebSocket entry point ─────────────────────────────────────────────

async def handle_websocket(websocket: WebSocket, session_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
        
    try:
        user_id = get_current_user_ws(token)
    except Exception as e:
        await websocket.close(code=1008, reason=str(e))
        return

    await websocket.accept()
    
    arena_session_id = None
    if AsyncSessionLocal:
        async with AsyncSessionLocal() as db:
            new_arena = ArenaSession(user_id=user_id, language="python") # Default
            db.add(new_arena)
            await db.commit()
            await db.refresh(new_arena)
            arena_session_id = new_arena.id
            
    _active_connections[session_id] = websocket
    _get_turn_lock(session_id)
    _get_barge_in(session_id)
    print(f"[KOGNIT] WS connected: {session_id} for user {user_id}")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            t = event.get("type")
            if t == "code_update":
                await _handle_code_update(session_id, websocket, event)
            elif t == "audio_in":
                asyncio.create_task(_handle_audio_in(session_id, websocket, event))
            elif t == "barge_in":
                _handle_barge_in(session_id)
            elif t == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        print(f"[KOGNIT] WS disconnected: {session_id}")
    except Exception as e:
        print(f"[KOGNIT] WS error ({session_id}): {e}")
    finally:
        _active_connections.pop(session_id, None)
        _turn_locks.pop(session_id, None)
        _barge_in_flags.pop(session_id, None)
        task = _analysis_tasks.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            
        if arena_session_id and AsyncSessionLocal:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(ArenaSession)
                    .where(ArenaSession.id == arena_session_id)
                    .values(ended_at=datetime.now(timezone.utc))
                )
                await db.commit()


# ── Barge-in ──────────────────────────────────────────────────────────

def _handle_barge_in(session_id: str) -> None:
    flag = _get_barge_in(session_id)
    flag.set()
    print(f"[KOGNIT] Barge-in received — {session_id}")


# ── Code-edit path ────────────────────────────────────────────────────

async def _handle_code_update(session_id: str, ws: WebSocket, event: dict):
    code = event.get("code", "")
    language = event.get("language", "")
    update_code_snapshot(session_id, code, language)

    existing_task = _analysis_tasks.pop(session_id, None)
    if existing_task and not existing_task.done():
        existing_task.cancel()

    _analysis_tasks[session_id] = asyncio.create_task(
        _debounced_analysis(session_id, ws, code, language)
    )


async def _debounced_analysis(session_id: str, ws: WebSocket, code: str, language: str):
    try:
        await asyncio.sleep(CODE_ANALYSIS_DEBOUNCE)
    except asyncio.CancelledError:
        return

    if len(code.strip()) < 10:
        return

    lock = _get_turn_lock(session_id)
    if lock.locked():
        print(f"[KOGNIT] Skipping background analysis — turn active ({session_id})")
        return

    async with lock:
        await _run_ai_turn(session_id, ws, code, language, user_question=None)


# ── Voice path ────────────────────────────────────────────────────────

async def _handle_audio_in(session_id: str, ws: WebSocket, event: dict):
    audio_b64 = event.get("audio", "")
    audio_format = event.get("format", "webm")
    if not audio_b64:
        return

    audio_bytes = base64.b64decode(audio_b64)
    await _send_event(ws, {"type": "ai_state", "state": "listening"})

    transcript = await transcribe_audio(audio_bytes, audio_format)
    if not transcript:
        await _send_event(ws, {"type": "ai_state", "state": "idle"})
        return

    await _send_event(ws, {"type": "user_transcript", "text": transcript})
    add_message(session_id, "user", transcript)

    session = get_session(session_id)
    lock = _get_turn_lock(session_id)
    async with lock:
        await _run_ai_turn(
            session_id, ws,
            code=session.get("code_snapshot", ""),
            language=session.get("language", ""),
            user_question=transcript,
        )


# ── Shared AI turn ────────────────────────────────────────────────────

async def _run_ai_turn(
    session_id: str,
    ws: WebSocket,
    code: str,
    language: str,
    user_question: str | None,
) -> None:
    """
    Single-flight AI turn. Streams Gemini sentences to ElevenLabs chunks to frontend.
    Checks the barge-in flag before each sentence so interruption is near-instant.
    Falls back to full TTS if streaming TTS is unavailable.
    """
    session = get_session(session_id)
    barge_in = _get_barge_in(session_id)
    barge_in.clear()

    await _send_event(ws, {"type": "ai_state", "state": "thinking"})
    print(f"[KOGNIT] AI turn start — session={session_id} voice={bool(user_question)}")

    full_response_parts: list[str] = []
    first_sentence = True
    used_stream = False

    try:
        async for sentence in analyze_code_stream(
            code=code,
            language=language,
            conversation_history=session.get("messages", []),
            last_error=session.get("last_error"),
            user_question=user_question,
        ):
            if barge_in.is_set():
                print(f"[KOGNIT] Barge-in: stopping turn mid-stream ({session_id})")
                break

            if sentence.strip() == "__SILENT__":
                break

            used_stream = True
            full_response_parts.append(sentence)

            # Show first sentence in UI immediately
            if first_sentence:
                await _send_event(ws, {"type": "ai_response", "text": sentence})
                await _send_event(ws, {"type": "ai_state", "state": "speaking"})
                first_sentence = False

            # Stream sentence to TTS, piping chunks to frontend as they arrive
            sent = await stream_tts_to_ws(sentence, ws)

            # ElevenLabs not configured — fall back to whole-sentence audio
            if not sent:
                audio = await text_to_speech(sentence)
                if audio:
                    await _send_event(ws, {
                        "type": "audio_out",
                        "audio": audio_to_base64(audio),
                        "format": "mp3",
                    })

            if barge_in.is_set():
                print(f"[KOGNIT] Barge-in: stopping after sentence ({session_id})")
                break

    except Exception as e:
        print(f"[KOGNIT] AI turn stream error ({session_id}): {e}")

    await _send_event(ws, {"type": "ai_state", "state": "idle"})

    if full_response_parts:
        full_response = " ".join(full_response_parts)
        add_message(session_id, "assistant", full_response)
        set_last_error(session_id, full_response)
        # Update UI with the complete assembled response
        await _send_event(ws, {"type": "ai_response", "text": full_response})
    elif not used_stream and not user_question:
        session = get_session(session_id)
        if session.get("last_error"):
            set_last_error(session_id, None)

    print(f"[KOGNIT] AI turn complete — session={session_id} barged={barge_in.is_set()}")


# ── Helpers ───────────────────────────────────────────────────────────

async def _send_event(ws: WebSocket, event: dict):
    try:
        await ws.send_text(json.dumps(event))
    except Exception as e:
        print(f"[KOGNIT] WS send error: {e}")
