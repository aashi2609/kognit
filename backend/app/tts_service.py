"""
Kognit Backend — Text-to-Speech Service (ElevenLabs)

Two modes:
  - text_to_speech(text)         → full MP3 bytes (legacy, used by heuristic fallback)
  - stream_tts_chunks(text, ws)  → streams MP3 chunks over WebSocket as they arrive
"""

from __future__ import annotations

import os
import re as _re
import base64
import asyncio
from fastapi import WebSocket
from dotenv import load_dotenv


load_dotenv()

_VOICE_ID = "pNInz6obpgDQGcFmaJgB"   # Adam
_MODEL_ID = "eleven_turbo_v2_5"
_OUTPUT_FORMAT = "mp3_44100_128"


def _make_elevenlabs_client(api_key: str):
    """
    Return a synchronous ElevenLabs client with SSL verification disabled
    for corporate networks that use MITM SSL inspection (e.g. Zscaler).
    Mirrors the same KOGNIT_SSL_VERIFY env-var pattern used for Gemini.
    """
    import httpx
    from elevenlabs.client import ElevenLabs
    ssl_verify = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")
    return ElevenLabs(api_key=api_key, httpx_client=httpx.Client(verify=ssl_verify))


# ── Full-response TTS (kept for heuristic fallback path) ─────────────

def _generate_tts_sync(text: str, api_key: str) -> bytes | None:
    """Synchronous ElevenLabs call — runs in a thread via asyncio.to_thread."""
    try:
        client = _make_elevenlabs_client(api_key)
        audio_generator = client.text_to_speech.convert(
            voice_id=_VOICE_ID,
            text=text,
            model_id=_MODEL_ID,
            output_format=_OUTPUT_FORMAT,
        )
        audio_bytes = b"".join(audio_generator)
        print(f"[KOGNIT] TTS full: {len(audio_bytes)} bytes for {len(text)} chars")
        return audio_bytes
    except Exception as e:
        print(f"[KOGNIT] ElevenLabs TTS error: {e}")
        return None


def prepare_text_for_tts(text: str) -> str:
    if not text:
        return ""
        
    # Replace literal punctuation symbols inside quotes so the TTS engine actually pronounces them as words
    replacements = {
        '";"': ' semicolon ',
        "';'": ' semicolon ',
        '","': ' comma ',
        "','": ' comma ',
        '":"': ' colon ',
        "':'": ' colon ',
        '"("': ' opening parenthesis ',
        "'('": ' opening parenthesis ',
        '")"': ' closing parenthesis ',
        "')'": ' closing parenthesis ',
        '"{"': ' opening curly brace ',
        "'{'": ' opening curly brace ',
        '"}"': ' closing curly brace ',
        "'}'": ' closing curly brace ',
        '"["': ' opening bracket ',
        "'['": ' opening bracket ',
        '"]"': ' closing bracket ',
        "']'": ' closing bracket ',
        '"="': ' equals ',
        "'='": ' equals ',
        '"+"': ' plus ',
        "'+'": ' plus ',
        '"-"': ' minus ',
        "'-'": ' minus ',
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
        
    # Replace standalone punctuation characters surrounded by spaces
    text = text.replace(' ; ', ' semicolon ')
    text = text.replace(' , ', ' comma ')
    text = text.replace(' : ', ' colon ')
    
    # Remove single and double quotes so they don't cause the TTS to skip words inside them
    text = text.replace('"', ' ')
    text = text.replace("'", ' ')
    
    # Clean up any consecutive whitespace
    text = _re.sub(r'\s+', ' ', text).strip()
    return text


async def text_to_speech(text: str) -> bytes | None:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    clean_text = prepare_text_for_tts(text)
    return await asyncio.to_thread(_generate_tts_sync, clean_text, api_key)


def audio_to_base64(audio_bytes: bytes) -> str:
    return base64.b64encode(audio_bytes).decode("utf-8")


# ── Streaming TTS ─────────────────────────────────────────────────────

async def stream_tts_to_ws(sentence: str, ws: WebSocket) -> bool:
    """
    Convert one sentence to speech via ElevenLabs streaming endpoint and
    send the complete sentence audio as a single 'tts_chunk' event once all
    chunks have been received. This avoids the gap problem from playing
    tiny individual MP3 fragments.

    Returns True if audio was sent, False on failure/no key.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return False

    clean_sentence = prepare_text_for_tts(sentence)

    # Collect all chunks for this sentence in a thread, then send as one blob
    loop = asyncio.get_running_loop()
    audio_bytes = await asyncio.to_thread(_collect_tts_sync, clean_sentence, api_key)

    if not audio_bytes:
        return False

    b64 = base64.b64encode(audio_bytes).decode("utf-8")
    await _safe_send(ws, {"type": "tts_chunk", "audio": b64, "format": "mp3"})
    print(f"[KOGNIT] TTS stream: '{clean_sentence[:50]}' → {len(audio_bytes)} bytes")
    return True


def _collect_tts_sync(sentence: str, api_key: str) -> bytes | None:
    """
    Stream audio from ElevenLabs using the documented .stream() method on the
    standard synchronous client (same client as the working .convert() path).
    Collects all chunks into one MP3 buffer and logs each chunk size so we
    can confirm real progressive streaming rather than one giant response.
    """
    try:
        client = _make_elevenlabs_client(api_key)
        chunks: list[bytes] = []
        for chunk in client.text_to_speech.stream(
            voice_id=_VOICE_ID,
            text=sentence,
            model_id="eleven_flash_v2_5",   # low-latency streaming model
            output_format=_OUTPUT_FORMAT,
        ):
            if chunk:
                chunks.append(chunk)
        total = sum(len(c) for c in chunks)
        print(f"[KOGNIT] TTS stream complete: {len(chunks)} chunks, {total} bytes total for '{sentence[:40]}'")
        return b"".join(chunks) if chunks else None
    except Exception as e:
        print(f"[KOGNIT] ElevenLabs stream TTS error: {e}")
        return None


async def _safe_send(ws: WebSocket, event: dict) -> None:
    import json
    try:
        await ws.send_text(json.dumps(event))
    except Exception:
        pass
