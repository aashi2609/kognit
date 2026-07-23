"""
Kognit Backend — Text-to-Speech Service (ElevenLabs)

Converts AI tutor text responses into audio for streaming
back to the frontend over WebSocket.
"""

from __future__ import annotations

import os
import io
import base64
from dotenv import load_dotenv

load_dotenv()


async def text_to_speech(text: str) -> bytes | None:
    """
    Convert text to speech audio using ElevenLabs API.
    Returns raw MP3 audio bytes, or None if TTS is not configured.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("[KOGNIT] ⚠ ElevenLabs not configured — skipping TTS")
        return None
    
    try:
        from elevenlabs.client import ElevenLabs
        
        client = ElevenLabs(api_key=api_key)
        
        # Use a warm, friendly voice
        # "Sarah" is a default free-tier voice
        audio_generator = client.text_to_speech.convert(
            voice_id="EXAVITQu4vr4xnSDxMaL",  # Sarah
            text=text,
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )
        
        # Collect the generator into bytes
        audio_bytes = b""
        for chunk in audio_generator:
            audio_bytes += chunk
        
        print(f"[KOGNIT] TTS generated: {len(audio_bytes)} bytes for {len(text)} chars")
        return audio_bytes
        
    except Exception as e:
        print(f"[KOGNIT] TTS error: {e}")
        return None


def audio_to_base64(audio_bytes: bytes) -> str:
    """Encode audio bytes to base64 for WebSocket transport."""
    return base64.b64encode(audio_bytes).decode("utf-8")
