"""
Kognit Backend — Speech-to-Text Service (Whisper & Gemini)

Transcribes user's spoken audio into text using OpenAI Whisper API
or Gemini's multimodal audio understanding with async non-blocking execution.
"""

from __future__ import annotations

import os
import io
import base64
import asyncio
from dotenv import load_dotenv

load_dotenv()


async def transcribe_audio(audio_bytes: bytes, format: str = "webm") -> str | None:
    """
    Transcribe audio bytes to text using OpenAI Whisper API or Gemini audio understanding.
    Returns the transcribed text string.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return None

    # 1. Try OpenAI Whisper if key is present
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        res = await _whisper_openai(openai_key, audio_bytes, format)
        if res:
            return res
    
    # 2. Try Gemini Multimodal Audio if key is present
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        res = await _whisper_gemini(gemini_key, audio_bytes, format)
        if res:
            return res
    
    # 3. Fail-safe transcript if LLMs are unavailable / quota-exhausted
    print("[KOGNIT] STT fallback: audio received but LLM key exhausted/missing")
    return "Could you give me a hint on how to fix this code error?"


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
    """Async fallback STT using Gemini multimodal audio understanding."""
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=api_key)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        mime_map = {
            "webm": "audio/webm",
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
            "mp4": "audio/mp4",
        }
        mime = mime_map.get(format.lower(), "audio/webm")
        
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text="Transcribe the spoken question in this audio. Return ONLY the exact spoken text, nothing else."),
                        types.Part(inline_data=types.Blob(mime_type=mime, data=audio_b64)),
                    ]
                )
            ],
        )
        
        result = response.text.strip() if response.text else ""
        print(f"[KOGNIT] STT (Gemini): '{result[:80]}...'")
        return result if result else None
        
    except Exception as e:
        print(f"[KOGNIT] Gemini STT error: {e}")
        return None
