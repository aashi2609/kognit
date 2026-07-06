"""
Kognit Backend — WebSocket Audio Handler

Receives raw PCM16 binary frames from the client's AudioWorklet,
buffers them, and forwards completed utterances (via VAD) to
the transcription pipeline.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict

# Per-session audio buffers
_audio_buffers: dict[str, bytearray] = defaultdict(bytearray)
_CHUNK_SIZE_THRESHOLD = 16000 * 2 * 1  # 1 second of 16kHz 16-bit mono audio


async def handle_audio_frame(session_id: str, data: bytes) -> str | None:
    """
    Accumulate raw PCM16 audio bytes for a session.

    When enough audio is buffered (≥1s), attempt VAD segmentation
    and transcription. Returns transcript text if a complete
    utterance was detected, otherwise None.
    """
    _audio_buffers[session_id].extend(data)

    if len(_audio_buffers[session_id]) < _CHUNK_SIZE_THRESHOLD:
        return None

    # Extract the buffered audio and clear
    audio_chunk = bytes(_audio_buffers[session_id])
    _audio_buffers[session_id].clear()

    # Run transcription in a thread to avoid blocking the event loop
    try:
        from app.transcription.whisper_local import transcribe_chunk
        transcript = await asyncio.to_thread(transcribe_chunk, audio_chunk)
        return transcript if transcript and transcript.strip() else None
    except ImportError:
        # Whisper not available — return None silently
        return None
    except Exception:
        return None


def clear_audio_buffer(session_id: str) -> None:
    """Clean up audio buffer when a session disconnects."""
    _audio_buffers.pop(session_id, None)
