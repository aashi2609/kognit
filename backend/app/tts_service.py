"""
Kognit Backend — Text-to-Speech Service (ElevenLabs)

Converts AI tutor text responses into audio for streaming
back to the frontend over WebSocket.
"""

from __future__ import annotations

import os
import io
import base64
import asyncio
from dotenv import load_dotenv

load_dotenv()


def _generate_tts_sync(text: str, api_key: str) -> bytes | None:
    """Synchronous ElevenLabs API call executed in a background worker thread."""
    try:
        from elevenlabs.client import ElevenLabs
        
        client = ElevenLabs(api_key=api_key)
        
        # Voice: Sarah (EXAVITQu4vr4xnSDxMaL)
        audio_generator = client.text_to_speech.convert(
            voice_id="EXAVITQu4vr4xnSDxMaL",
            text=text,
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )
        
        audio_bytes = b""
        for chunk in audio_generator:
            audio_bytes += chunk
        
        print(f"[KOGNIT] TTS generated successfully: {len(audio_bytes)} bytes for {len(text)} chars")
        return audio_bytes
        
    except Exception as e:
        print(f"[KOGNIT] ElevenLabs TTS error: {e}")
        return None


async def text_to_speech(text: str) -> bytes | None:
    """
    Convert text to speech audio using ElevenLabs API in a non-blocking thread.
    Returns raw MP3 audio bytes, or None if TTS is not configured / fails.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("[KOGNIT] ElevenLabs API key missing in environment")
        return None
    
    return await asyncio.to_thread(_generate_tts_sync, text, api_key)


def audio_to_base64(audio_bytes: bytes) -> str:
    """Encode audio bytes to base64 for WebSocket transport."""
    return base64.b64encode(audio_bytes).decode("utf-8")
