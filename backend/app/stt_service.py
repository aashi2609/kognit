"""
Kognit Backend — Speech-to-Text Service (OpenAI Whisper)

Transcribes user's spoken audio into text using the Whisper API.
"""

from __future__ import annotations

import os
import io
from dotenv import load_dotenv

load_dotenv()


async def transcribe_audio(audio_bytes: bytes, format: str = "webm") -> str | None:
    """
    Transcribe audio bytes to text using OpenAI's Whisper API.
    Returns the transcribed text, or None if STT is not configured.
    
    Falls back to Gemini if OpenAI is not configured.
    """
    # Try OpenAI Whisper first
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return await _whisper_openai(openai_key, audio_bytes, format)
    
    # Fallback: use Gemini's audio understanding
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        return await _whisper_gemini(gemini_key, audio_bytes, format)
    
    print("[KOGNIT] ⚠ No STT provider configured")
    return None


async def _whisper_openai(api_key: str, audio_bytes: bytes, format: str) -> str | None:
    """Transcribe with OpenAI Whisper API."""
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=api_key)
        
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = f"audio.{format}"
        
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",
        )
        
        result = transcript.strip() if isinstance(transcript, str) else str(transcript).strip()
        print(f"[KOGNIT] STT (Whisper): '{result[:80]}...'")
        return result if result else None
        
    except Exception as e:
        print(f"[KOGNIT] Whisper error: {e}")
        return None


async def _whisper_gemini(api_key: str, audio_bytes: bytes, format: str) -> str | None:
    """Fallback STT using Gemini's multimodal audio understanding (new SDK)."""
    try:
        from google import genai
        from google.genai import types
        import base64
        
        client = genai.Client(api_key=api_key)
        
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        mime_map = {
            "webm": "audio/webm",
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
        }
        mime = mime_map.get(format, "audio/webm")
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text="Transcribe the following audio. Return ONLY the spoken words, nothing else."),
                        types.Part(inline_data=types.Blob(mime_type=mime, data=audio_b64)),
                    ]
                )
            ],
        )
        
        result = response.text.strip()
        print(f"[KOGNIT] STT (Gemini): '{result[:80]}...'")
        return result if result else None
        
    except Exception as e:
        print(f"[KOGNIT] Gemini STT error: {e}")
        return None

