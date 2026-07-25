"""
Kognit Backend — Speech-to-Text Service (Whisper & Gemini)

Transcribes user's spoken audio into text using OpenAI Whisper API
or Gemini's multimodal audio understanding with async non-blocking execution.
"""

from __future__ import annotations

import os
import io
import base64
import time
from dotenv import load_dotenv

load_dotenv()

# ── STT circuit breaker ───────────────────────────────────────────────
# Independent from the text-analysis breaker — STT and LLM quotas can
# exhaust at different rates.
_gemini_stt_exhausted_until: float = 0.0
_STT_COOLDOWN_SECS = 120


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

    # 2. Try Gemini Multimodal Audio — skip if circuit breaker is open
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        if time.time() < _gemini_stt_exhausted_until:
            remaining = int(_gemini_stt_exhausted_until - time.time())
            print(f"[KOGNIT] STT circuit-breaker open — skipping Gemini for {remaining}s")
        else:
            res = await _whisper_gemini(gemini_key, audio_bytes, format)
            if res:
                return res

    # 3. Fail-safe transcript
    print("[KOGNIT] STT fallback: audio received but LLM unavailable/exhausted")
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
    """
    STT using Gemini multimodal audio via direct httpx REST calls.
    Has its own circuit breaker independent of the text-analysis one.
    """
    import httpx

    global _gemini_stt_exhausted_until

    _ssl_verify = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

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
    models_to_try = ["gemini-3.6-flash", "gemini-2.0-flash-lite"]
    all_quota = True

    async with httpx.AsyncClient(verify=_ssl_verify, timeout=8) as client:
        for model_name in models_to_try:
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
        _gemini_stt_exhausted_until = time.time() + _STT_COOLDOWN_SECS
        print(f"[KOGNIT] All STT Gemini models quota-exhausted — circuit breaker open for {_STT_COOLDOWN_SECS}s")
    else:
        print("[KOGNIT] STT Gemini: all models exhausted.")
    return None
