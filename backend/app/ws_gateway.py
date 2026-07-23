"""
Kognit Backend — WebSocket Gateway

Handles the real-time bidirectional communication between the frontend
and the AI tutor engine. Multiplexes three event types:
  - code_update: Student's code changes (debounced)
  - audio_in: Student's voice audio chunks
  - audio_out: AI's spoken response audio
"""

from __future__ import annotations

import json
import asyncio
import time
import base64
from fastapi import WebSocket, WebSocketDisconnect

from app.session_store import (
    get_session, save_session, add_message,
    update_code_snapshot, set_last_error,
)
from app.code_analyzer import analyze_code
from app.tts_service import text_to_speech, audio_to_base64
from app.stt_service import transcribe_audio


# Track active connections and their analysis debounce timers
_active_connections: dict[str, WebSocket] = {}
_analysis_tasks: dict[str, asyncio.Task] = {}

# Debounce delay: wait this many seconds after the last keystroke
# before analyzing code, giving the student time to finish typing.
CODE_ANALYSIS_DEBOUNCE = 4.0  # seconds


async def handle_websocket(websocket: WebSocket, session_id: str):
    """
    Main WebSocket handler. Receives JSON events from the frontend,
    processes them, and sends back responses.
    """
    await websocket.accept()
    _active_connections[session_id] = websocket
    print(f"[KOGNIT] WS connected: {session_id}")
    
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue
            
            event_type = event.get("type")
            
            if event_type == "code_update":
                await _handle_code_update(session_id, websocket, event)
            
            elif event_type == "audio_in":
                await _handle_audio_in(session_id, websocket, event)
            
            elif event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            
    except WebSocketDisconnect:
        print(f"[KOGNIT] WS disconnected: {session_id}")
    except Exception as e:
        print(f"[KOGNIT] WS error ({session_id}): {e}")
    finally:
        _active_connections.pop(session_id, None)
        # Cancel any pending analysis
        task = _analysis_tasks.pop(session_id, None)
        if task and not task.done():
            task.cancel()


async def _handle_code_update(session_id: str, ws: WebSocket, event: dict):
    """
    Handle a code_update event. Debounce the analysis so we don't
    spam the LLM on every keystroke.
    """
    code = event.get("code", "")
    language = event.get("language", "")
    
    # Update the session's code snapshot immediately
    update_code_snapshot(session_id, code, language)
    
    # Cancel any existing pending analysis
    existing_task = _analysis_tasks.pop(session_id, None)
    if existing_task and not existing_task.done():
        existing_task.cancel()
    
    # Schedule a new debounced analysis
    _analysis_tasks[session_id] = asyncio.create_task(
        _debounced_analysis(session_id, ws, code, language)
    )


async def _debounced_analysis(session_id: str, ws: WebSocket, code: str, language: str):
    """Wait for the debounce period, then analyze the code."""
    try:
        await asyncio.sleep(CODE_ANALYSIS_DEBOUNCE)
    except asyncio.CancelledError:
        return  # New keystroke came in, cancel this analysis
    
    # Don't analyze empty or very short code
    if len(code.strip()) < 10:
        return
    
    session = get_session(session_id)
    
    # Send "thinking" indicator to frontend
    await _send_event(ws, {
        "type": "ai_state",
        "state": "thinking",
    })
    
    # Run the LLM analysis
    response = await analyze_code(
        code=code,
        language=language,
        conversation_history=session.get("messages", []),
        last_error=session.get("last_error"),
    )
    
    if response is None:
        # AI says code looks fine, stay silent
        await _send_event(ws, {"type": "ai_state", "state": "idle"})
        # If there was a previous error and now code is clean, clear it
        if session.get("last_error"):
            set_last_error(session_id, None)
        return
    
    # Store the AI's response in conversation history
    add_message(session_id, "assistant", response)
    
    # Track the error for mastery detection
    set_last_error(session_id, response)
    
    # Send the text response to frontend
    await _send_event(ws, {
        "type": "ai_response",
        "text": response,
    })
    
    # Generate and send TTS audio
    await _send_event(ws, {"type": "ai_state", "state": "speaking"})
    audio = await text_to_speech(response)
    if audio:
        await _send_event(ws, {
            "type": "audio_out",
            "audio": audio_to_base64(audio),
            "format": "mp3",
        })
    
    await _send_event(ws, {"type": "ai_state", "state": "idle"})


async def _handle_audio_in(session_id: str, ws: WebSocket, event: dict):
    """
    Handle incoming audio from the user's microphone.
    Transcribe it and generate a contextual AI response.
    """
    audio_b64 = event.get("audio", "")
    audio_format = event.get("format", "webm")
    
    if not audio_b64:
        return
    
    audio_bytes = base64.b64decode(audio_b64)
    
    # Send "listening" state
    await _send_event(ws, {"type": "ai_state", "state": "listening"})
    
    # Transcribe the audio
    transcript = await transcribe_audio(audio_bytes, audio_format)
    
    if not transcript:
        await _send_event(ws, {"type": "ai_state", "state": "idle"})
        return
    
    # Send transcript to frontend for display
    await _send_event(ws, {
        "type": "user_transcript",
        "text": transcript,
    })
    
    # Store user's message
    add_message(session_id, "user", transcript)
    
    # Get current session context
    session = get_session(session_id)
    
    # Think...
    await _send_event(ws, {"type": "ai_state", "state": "thinking"})
    
    # Generate AI response with the question in context
    response = await analyze_code(
        code=session.get("code_snapshot", ""),
        language=session.get("language", ""),
        conversation_history=session.get("messages", []),
        last_error=session.get("last_error"),
        user_question=transcript,
    )
    
    if not response:
        response = "Hmm, I'm not sure I caught that. Could you say it again?"
    
    # Store AI response
    add_message(session_id, "assistant", response)
    
    # Send text response
    await _send_event(ws, {
        "type": "ai_response",
        "text": response,
    })
    
    # Generate and send TTS
    await _send_event(ws, {"type": "ai_state", "state": "speaking"})
    audio = await text_to_speech(response)
    if audio:
        await _send_event(ws, {
            "type": "audio_out",
            "audio": audio_to_base64(audio),
            "format": "mp3",
        })
    
    await _send_event(ws, {"type": "ai_state", "state": "idle"})


async def _send_event(ws: WebSocket, event: dict):
    """Safely send a JSON event over WebSocket."""
    try:
        await ws.send_text(json.dumps(event))
    except Exception as e:
        print(f"[KOGNIT] WS send error: {e}")
