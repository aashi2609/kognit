"""
Kognit Backend — Cloud Speech-to-Text Fallback

Swappable cloud transcription backend.
Set STT_BACKEND=deepgram or STT_BACKEND=google in .env.
"""

from __future__ import annotations

import base64

import httpx

from app.config import settings


async def transcribe_chunk_cloud(audio_bytes: bytes) -> str:
    """
    Transcribe raw PCM16 audio via a cloud STT provider.

    Currently supports:
      - deepgram: Deepgram Nova-2
      - google:   Google Cloud Speech-to-Text (placeholder)
    """
    if settings.stt_backend == "deepgram":
        return await _transcribe_deepgram(audio_bytes)
    elif settings.stt_backend == "google":
        return await _transcribe_google(audio_bytes)
    else:
        return ""


async def _transcribe_deepgram(audio_bytes: bytes) -> str:
    """Send audio to Deepgram's streaming API."""
    if not settings.deepgram_api_key:
        return "[STT] Deepgram API key not configured"

    url = "https://api.deepgram.com/v1/listen"
    params = {
        "model": "nova-2",
        "language": "en",
        "encoding": "linear16",
        "sample_rate": "16000",
        "channels": "1",
    }
    headers = {
        "Authorization": f"Token {settings.deepgram_api_key}",
        "Content-Type": "audio/raw",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                url, params=params, headers=headers, content=audio_bytes,
            )
            response.raise_for_status()
            data = response.json()

        # Extract transcript from Deepgram response
        channels = data.get("results", {}).get("channels", [])
        if channels:
            alternatives = channels[0].get("alternatives", [])
            if alternatives:
                return alternatives[0].get("transcript", "")
        return ""

    except Exception as e:
        return f"[STT Error] {e}"


async def _transcribe_google(audio_bytes: bytes) -> str:
    """
    Placeholder for Google Cloud Speech-to-Text.
    Implement when needed — requires google-cloud-speech SDK.
    """
    return "[STT] Google Cloud STT not yet implemented. Set STT_BACKEND=local or deepgram."
