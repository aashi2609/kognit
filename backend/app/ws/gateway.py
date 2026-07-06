"""
Kognit Backend — Unified WebSocket Gateway

Single multiplexed endpoint at /ws/{session_id} that handles:
  - Binary frames  → audio pipeline
  - JSON messages  → code updates, tracking events, execution requests

Dispatches to appropriate handlers and pushes results back to client.
"""

from __future__ import annotations

import json
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.cache.redis_client import push_code_diff, push_transcript
from app.executor.base import get_executor
from app.executor.schemas import ExecutionRequest
from app.ws.audio import clear_audio_buffer, handle_audio_frame
from app.ws.protocol import (
    CodeUpdate,
    ExecuteCode,
    ServerPush,
    TrackingEvent,
    parse_client_message,
)

router = APIRouter()

# Track active connections per session
_active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/{session_id}")
async def websocket_gateway(websocket: WebSocket, session_id: str):
    """
    Unified, multiplexed WebSocket endpoint.

    Protocol:
      - Binary messages → audio PCM16 frames
      - Text messages   → JSON with a 'type' field
    """
    await websocket.accept()

    # Register connection
    if session_id not in _active_connections:
        _active_connections[session_id] = []
    _active_connections[session_id].append(websocket)

    # Send initial acknowledgement
    await _push(websocket, "confusion_update", {
        "confusion_score": 0.0,
        "status": "connected",
    })

    try:
        while True:
            # Receive either binary or text
            message = await websocket.receive()

            if "bytes" in message and message["bytes"]:
                # ── Binary: Audio frame ───────────────────────────────
                transcript = await handle_audio_frame(session_id, message["bytes"])
                if transcript:
                    await push_transcript(session_id, transcript)
                    await _push(websocket, "transcript_update", {
                        "text": transcript,
                    })

            elif "text" in message and message["text"]:
                # ── Text: JSON message ────────────────────────────────
                try:
                    raw = json.loads(message["text"])
                except json.JSONDecodeError:
                    await _push(websocket, "error", {"message": "Invalid JSON"})
                    continue

                parsed = parse_client_message(raw)
                if parsed is None:
                    await _push(websocket, "error", {
                        "message": f"Unknown message type: {raw.get('type')}",
                    })
                    continue

                # Dispatch by type
                if isinstance(parsed, CodeUpdate):
                    await _handle_code_update(websocket, session_id, parsed)

                elif isinstance(parsed, ExecuteCode):
                    await _handle_execute_code(websocket, session_id, parsed)

                elif isinstance(parsed, TrackingEvent):
                    await _handle_tracking(websocket, session_id, parsed)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        traceback.print_exc()
        try:
            await _push(websocket, "error", {"message": str(e)})
        except Exception:
            pass
    finally:
        # Cleanup
        clear_audio_buffer(session_id)
        if session_id in _active_connections:
            _active_connections[session_id] = [
                ws for ws in _active_connections[session_id] if ws != websocket
            ]
            if not _active_connections[session_id]:
                del _active_connections[session_id]


# ── Handlers ──────────────────────────────────────────────────────────

async def _handle_code_update(
    websocket: WebSocket,
    session_id: str,
    msg: CodeUpdate,
) -> None:
    """Store code diff in Redis rolling window."""
    await push_code_diff(session_id, {
        "file_name": msg.file_name,
        "language": msg.language,
        "content": msg.content,
        "cursor_line": msg.cursor_line,
    })


async def _handle_execute_code(
    websocket: WebSocket,
    session_id: str,
    msg: ExecuteCode,
) -> None:
    """Compile and run code, push result back to client."""
    executor = get_executor()
    result = await executor.execute(
        ExecutionRequest(
            language=msg.language,
            source_code=msg.source_code,
            stdin=msg.stdin,
        )
    )
    await _push(websocket, "execution_result", result.model_dump())


async def _handle_tracking(
    websocket: WebSocket,
    session_id: str,
    msg: TrackingEvent,
) -> None:
    """Log tracking event (placeholder for analytics pipeline)."""
    # For now, just acknowledge — future: write to metrics store
    pass


# ── Utility ───────────────────────────────────────────────────────────

async def _push(websocket: WebSocket, msg_type: str, payload: dict) -> None:
    """Send a typed ServerPush message to the client."""
    push = ServerPush(type=msg_type, payload=payload)  # type: ignore
    await websocket.send_json(push.model_dump())
