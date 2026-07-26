"""
Kognit Backend — Speech-to-Text Service (Groq Whisper, OpenAI Whisper & Gemini)

Priority order:
  1. Groq Whisper (free, fast, best accuracy for voice)
  2. OpenAI Whisper (if OPENAI_API_KEY set)
  3. Gemini multimodal (fallback, uses shared circuit breaker)
"""

from __future__ import annotations

import os
import io
import base64
from dotenv import load_dotenv
from app.gemini_config import GEMINI_MODELS, SSL_VERIFY as _SSL_VERIFY, stt_breaker_open, trip_stt_breaker

load_dotenv()


async def transcribe_audio(audio_bytes: bytes, format: str = "webm") -> str | None:
    """
    Transcribe audio bytes to text.
    Returns the transcribed text string, or None if all providers fail.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return None

    # 1. Groq Whisper — free tier, fastest, most accurate for speech
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        res = await _whisper_groq(groq_key, audio_bytes, format)
        if res:
            return res

    # 2. OpenAI Whisper
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        res = await _whisper_openai(openai_key, audio_bytes, format)
        if res:
            return res

    # 3. Gemini multimodal — skip if circuit breaker is open
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        if stt_breaker_open():
            pass  # breaker already logged
        else:
            res = await _whisper_gemini(gemini_key, audio_bytes, format)
            if res:
                return res

    # 4. Fail-safe
    print("[KOGNIT] STT fallback: all providers failed or unavailable")
    return "Could you give me a hint on how to fix this code error?"


async def _whisper_groq(api_key: str, audio_bytes: bytes, format: str) -> str | None:
    """
    STT via Groq's Whisper endpoint (free tier, ~250 req/day).
    Uses whisper-large-v3-turbo — fast and accurate.
    """
    import httpx

    # Groq requires a real filename with a supported extension
    ext_map = {"webm": "webm", "wav": "wav", "mp3": "mp3", "ogg": "ogg", "mp4": "mp4"}
    ext = ext_map.get(format.lower(), "webm")

    try:
        async with httpx.AsyncClient(verify=_SSL_VERIFY, timeout=15) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (f"audio.{ext}", io.BytesIO(audio_bytes), f"audio/{ext}")},
                data={"model": "whisper-large-v3-turbo", "response_format": "text"},
            )
            if response.status_code == 200:
                result = response.text.strip()
                if result:
                    print(f"[KOGNIT] STT (Groq Whisper): '{result[:80]}'")
                    return result
            elif response.status_code == 429:
                print("[KOGNIT] STT Groq: rate limited")
            else:
                print(f"[KOGNIT] STT Groq error {response.status_code}: {response.text[:100]}")
    except Exception as e:
        print(f"[KOGNIT] STT Groq exception: {str(e)[:100]}")
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
        print(f"[KOGNIT] STT (Whisper): '{result[:80]}'")
        return result if result else None
    except Exception as e:
        print(f"[KOGNIT] Whisper error: {e}")
        return None


async def _whisper_gemini(api_key: str, audio_bytes: bytes, format: str) -> str | None:
    """STT using Gemini multimodal audio via direct httpx REST. Uses shared model list and circuit breaker."""
    import httpx

    mime_map = {
        "webm": "audio/webm",
        "wav":  "audio/wav",
        "mp3":  "audio/mpeg",
        "ogg":  "audio/ogg",
        "mp4":  "audio/mp4",
    }
    mime = mime_map.get(format.lower(), "audio/webm")
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    request_body = {
        "contents": [{
            "role": "user",
            "parts": [
                {
                    "text": (
                        "Transcribe this audio exactly as spoken. "
                        "Output only the transcribed text, nothing else. "
                        "No labels, no punctuation changes, no explanations."
                    )
                },
                {"inline_data": {"mime_type": mime, "data": audio_b64}},
            ],
        }],
        "generationConfig": {"maxOutputTokens": 200, "temperature": 0.0},
    }

    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    all_quota = True

    async with httpx.AsyncClient(verify=_SSL_VERIFY, timeout=8) as client:
        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            try:
                response = await client.post(url, headers=headers, json=request_body)
                if response.status_code == 200:
                    data = response.json()
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    result = next((p["text"].strip() for p in parts if "text" in p), None)
                    if result:
                        print(f"[KOGNIT] STT (Gemini/{model_name}): '{result[:80]}'")
                        return result
                    all_quota = False
                elif response.status_code == 429:
                    print(f"[KOGNIT] STT Gemini ({model_name}): quota exhausted, trying next...")
                    continue
                else:
                    err = response.json().get("error", {}).get("message", "")[:100]
                    print(f"[KOGNIT] STT Gemini ({model_name}) error {response.status_code}: {err}")
                    all_quota = False
                    continue
            except Exception as e:
                all_quota = False
                print(f"[KOGNIT] STT Gemini ({model_name}) exception: {str(e)[:100]}")
                continue

    if all_quota:
        trip_stt_breaker()
    else:
        print("[KOGNIT] STT Gemini: all models exhausted.")
    return None
