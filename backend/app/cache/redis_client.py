"""
Kognit Backend — Redis Client

Async Redis client providing:
  - Rolling window buffers for code diffs (45s TTL) and transcripts (30s TTL)
  - Pub/Sub channels for broadcasting WebSocket messages across instances
"""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

# ── Connection Pool ───────────────────────────────────────────────────
_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Lazily initialise and return the shared Redis connection."""
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=20,
        )
    return _pool


async def close_redis() -> None:
    """Gracefully close the Redis connection pool."""
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None


# ── Rolling Window: Code Diffs ────────────────────────────────────────
_CODE_DIFF_PREFIX = "rolling:code_diff:"
_CODE_DIFF_TTL = 45  # seconds


async def push_code_diff(session_id: str, diff: dict[str, Any]) -> None:
    """Append a code diff to the session's rolling window (45s TTL)."""
    r = await get_redis()
    key = f"{_CODE_DIFF_PREFIX}{session_id}"
    await r.rpush(key, json.dumps(diff))
    await r.expire(key, _CODE_DIFF_TTL)


async def get_code_diffs(session_id: str) -> list[dict[str, Any]]:
    """Retrieve all code diffs in the rolling window."""
    r = await get_redis()
    key = f"{_CODE_DIFF_PREFIX}{session_id}"
    raw = await r.lrange(key, 0, -1)
    return [json.loads(item) for item in raw]


# ── Rolling Window: Transcripts ───────────────────────────────────────
_TRANSCRIPT_PREFIX = "rolling:transcript:"
_TRANSCRIPT_TTL = 30  # seconds


async def push_transcript(session_id: str, text: str) -> None:
    """Append a transcript chunk to the session's rolling window (30s TTL)."""
    r = await get_redis()
    key = f"{_TRANSCRIPT_PREFIX}{session_id}"
    await r.rpush(key, text)
    await r.expire(key, _TRANSCRIPT_TTL)


async def get_transcripts(session_id: str) -> list[str]:
    """Retrieve all transcript chunks in the rolling window."""
    r = await get_redis()
    key = f"{_TRANSCRIPT_PREFIX}{session_id}"
    return await r.lrange(key, 0, -1)


# ── Pub/Sub ───────────────────────────────────────────────────────────
def broadcast_channel(session_id: str) -> str:
    """Return the pub/sub channel name for a given session."""
    return f"ws:broadcast:{session_id}"


async def publish_to_session(session_id: str, message: dict[str, Any]) -> None:
    """Publish a message to all WebSocket connections for this session."""
    r = await get_redis()
    await r.publish(broadcast_channel(session_id), json.dumps(message))
