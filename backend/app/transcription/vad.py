"""
Kognit Backend — Voice Activity Detection (Silero VAD)

Lightweight (~2MB) neural VAD that segments audio on natural
speech pauses, preventing unnecessary transcription of silence.
Runs on CPU with minimal overhead.
"""

from __future__ import annotations

import numpy as np

# Lazy-loaded model singleton
_vad_model = None
_vad_utils = None


def _get_vad():
    """Lazily load the Silero VAD model via torch.hub."""
    global _vad_model, _vad_utils
    if _vad_model is None:
        try:
            import torch
            model, utils = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
                onnx=True,  # Use ONNX for faster CPU inference
            )
            _vad_model = model
            _vad_utils = utils
            print("[KOGNIT] ✓ Silero VAD model loaded (ONNX/CPU)")
        except ImportError:
            raise ImportError(
                "torch is required for Silero VAD. "
                "Install with: pip install torch"
            )
    return _vad_model, _vad_utils


def detect_speech_segments(
    audio_bytes: bytes,
    sample_rate: int = 16000,
    min_silence_ms: int = 300,
    speech_pad_ms: int = 200,
) -> list[dict]:
    """
    Detect speech segments in raw PCM16 audio.

    Args:
        audio_bytes: Raw PCM16 mono audio bytes.
        sample_rate: Audio sample rate (default 16kHz).
        min_silence_ms: Minimum silence duration to split on.
        speech_pad_ms: Padding around detected speech.

    Returns:
        List of dicts with 'start' and 'end' keys (in seconds).
    """
    import torch

    model, utils = _get_vad()
    get_speech_timestamps = utils[0]

    # Convert PCM16 bytes → torch tensor
    audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    audio_tensor = torch.from_numpy(audio_array)

    if audio_tensor.numel() == 0:
        return []

    # Run VAD
    timestamps = get_speech_timestamps(
        audio_tensor,
        model,
        sampling_rate=sample_rate,
        min_silence_duration_ms=min_silence_ms,
        speech_pad_ms=speech_pad_ms,
    )

    # Convert sample indices to seconds
    return [
        {
            "start": round(ts["start"] / sample_rate, 3),
            "end": round(ts["end"] / sample_rate, 3),
        }
        for ts in timestamps
    ]


def extract_speech_audio(
    audio_bytes: bytes,
    segments: list[dict],
    sample_rate: int = 16000,
) -> bytes:
    """
    Extract only the speech portions from audio based on VAD segments.

    Returns concatenated PCM16 bytes of speech-only audio.
    """
    audio_array = np.frombuffer(audio_bytes, dtype=np.int16)
    speech_parts = []

    for seg in segments:
        start_sample = int(seg["start"] * sample_rate)
        end_sample = int(seg["end"] * sample_rate)
        speech_parts.append(audio_array[start_sample:end_sample])

    if not speech_parts:
        return b""

    return np.concatenate(speech_parts).tobytes()
