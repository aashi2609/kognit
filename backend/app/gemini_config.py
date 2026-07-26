"""
Kognit — Centralized Gemini configuration.

Single source of truth for:
  - Which models to try (in priority order)
  - Shared circuit-breaker state for text-analysis and STT
  - SSL verification flag

Import GEMINI_MODELS from here everywhere — never hardcode model names.
"""

from __future__ import annotations

import os
import time

# ── Model list — only confirmed-working models, no deprecated names ──
# Order matters: first model tried first. gemini-2.0-flash-lite is the
# backup only — it may be quota-limited on free tier accounts.
GEMINI_MODELS: list[str] = ["gemini-3.6-flash", "gemini-2.0-flash-lite"]

# ── Shared SSL flag ───────────────────────────────────────────────────
SSL_VERIFY: bool = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")

# ── Circuit breakers ──────────────────────────────────────────────────
# Each breaker is a float timestamp: if time.time() < value, skip Gemini.
# Two separate breakers so STT and text-analysis quotas don't interfere.
_COOLDOWN_SECS = 120  # 2 minutes

_text_exhausted_until: float = 0.0
_stt_exhausted_until: float = 0.0


def text_breaker_open() -> bool:
    """Return True if the text-analysis circuit breaker is currently open."""
    if time.time() < _text_exhausted_until:
        remaining = int(_text_exhausted_until - time.time())
        print(f"[KOGNIT] Gemini text circuit-breaker open — skipping for {remaining}s")
        return True
    return False


def stt_breaker_open() -> bool:
    """Return True if the STT circuit breaker is currently open."""
    if time.time() < _stt_exhausted_until:
        remaining = int(_stt_exhausted_until - time.time())
        print(f"[KOGNIT] STT circuit-breaker open — skipping Gemini for {remaining}s")
        return True
    return False


def trip_text_breaker() -> None:
    global _text_exhausted_until
    _text_exhausted_until = time.time() + _COOLDOWN_SECS
    print(f"[KOGNIT] All Gemini text models quota-exhausted — circuit breaker open for {_COOLDOWN_SECS}s")


def trip_stt_breaker() -> None:
    global _stt_exhausted_until
    _stt_exhausted_until = time.time() + _COOLDOWN_SECS
    print(f"[KOGNIT] All STT Gemini models quota-exhausted — circuit breaker open for {_COOLDOWN_SECS}s")
