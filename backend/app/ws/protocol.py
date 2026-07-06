"""
Kognit Backend — WebSocket Protocol

Pydantic models defining every message type that flows
through the multiplexed WebSocket connection.

CLIENT → SERVER:
  - AudioFrame    : raw PCM16 binary (sent as bytes, not JSON)
  - CodeUpdate    : debounced Monaco onChange diffs
  - TrackingEvent : gaze / focus telemetry
  - ExecuteCode   : request to compile & run code

SERVER → CLIENT (ServerPush):
  - confusion_update    : new confusion score + markers
  - socratic_response   : Socratic question text
  - mastery_delta       : updated mastery values
  - tts_audio           : text-to-speech audio chunk (base64)
  - execution_result    : code compilation / run output
  - transcript_update   : speech-to-text result
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


# ── Client → Server ──────────────────────────────────────────────────

class CodeUpdate(BaseModel):
    """Debounced code diff from Monaco editor."""
    type: Literal["code_update"] = "code_update"
    file_name: str
    language: str
    content: str  # full file content (simpler than diffs for now)
    cursor_line: int = 0


class TrackingEvent(BaseModel):
    """Focus / engagement telemetry."""
    type: Literal["tracking"] = "tracking"
    event: str  # e.g. "focus_lost", "tab_switch", "idle_30s"
    timestamp_ms: int


class ExecuteCode(BaseModel):
    """Request to compile and run code."""
    type: Literal["execute_code"] = "execute_code"
    language: str
    source_code: str
    stdin: str = ""


# ── Server → Client ──────────────────────────────────────────────────

class ServerPush(BaseModel):
    """Envelope for all server-to-client pushes."""
    type: Literal[
        "confusion_update",
        "socratic_response",
        "mastery_delta",
        "tts_audio",
        "execution_result",
        "transcript_update",
        "error",
    ]
    payload: dict[str, Any]


# ── Helpers ───────────────────────────────────────────────────────────

# Map of client message type strings → Pydantic models
CLIENT_MESSAGE_TYPES: dict[str, type[BaseModel]] = {
    "code_update": CodeUpdate,
    "tracking": TrackingEvent,
    "execute_code": ExecuteCode,
}


def parse_client_message(raw: dict[str, Any]) -> BaseModel | None:
    """Parse a raw JSON dict into the correct typed message model."""
    msg_type = raw.get("type")
    model_cls = CLIENT_MESSAGE_TYPES.get(msg_type)  # type: ignore
    if model_cls is None:
        return None
    return model_cls.model_validate(raw)
