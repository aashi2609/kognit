"""
Kognit Backend — Local Whisper Transcription (CPU Mode)

Uses faster-whisper with the lightweight `base.en` model
running in int8 quantised CPU mode (~2x realtime on modern CPUs).
"""

from __future__ import annotations

import io
import numpy as np

from app.config import settings

# Lazy-loaded model singleton
_model = None


def _get_model():
    """Lazily load the faster-whisper model (heavy on first call)."""
    global _model
    if _model is None:
        try:
            from faster_whisper import WhisperModel
            _model = WhisperModel(
                settings.whisper_model_size,
                device="cpu",
                compute_type="int8",
            )
            print(f"[KOGNIT] ✓ Whisper model loaded: {settings.whisper_model_size} (CPU/int8)")
        except ImportError:
            raise ImportError(
                "faster-whisper is not installed. "
                "Install with: pip install faster-whisper"
            )
    return _model


def transcribe_chunk(audio_bytes: bytes) -> str:
    """
    Transcribe a chunk of raw PCM16 audio bytes.

    Args:
        audio_bytes: Raw PCM16 mono 16kHz audio data.

    Returns:
        Transcribed text string, or empty string if nothing detected.
    """
    model = _get_model()

    # Convert raw PCM16 bytes → float32 numpy array
    audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    if len(audio_array) == 0:
        return ""

    # Run transcription
    segments, info = model.transcribe(
        audio_array,
        beam_size=1,  # Fast mode for real-time
        language="en",
        vad_filter=True,  # Built-in VAD to skip silence
        vad_parameters=dict(
            min_silence_duration_ms=300,
            speech_pad_ms=200,
        ),
    )

    # Collect all segment texts
    texts = [segment.text for segment in segments]
    return " ".join(texts).strip()


def transcribe_file(audio_path: str) -> str:
    """Transcribe a full audio file (for testing / batch mode)."""
    model = _get_model()
    segments, info = model.transcribe(audio_path, beam_size=5, language="en")
    return " ".join(segment.text for segment in segments).strip()
