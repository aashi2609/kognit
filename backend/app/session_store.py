"""
Kognit Backend — Rolling Session State (Upstash Redis)

Stores per-session conversation history and code snapshots
so the AI tutor has full context across interactions.

SSL note: upstash_redis uses httpx internally. We patch ssl verification
off at the httpx level before constructing the client, matching the
KOGNIT_SSL_VERIFY pattern used everywhere else in this codebase.
"""

from __future__ import annotations

import os
import json
import time
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── In-memory fallback if Redis is not configured ────────────────────
_local_sessions: dict[str, dict] = {}

_SSL_VERIFY = os.getenv("KOGNIT_SSL_VERIFY", "0") not in ("0", "false", "no")


def _make_ssl_context():
    """Return an SSL context using certifi's CA bundle, or None if certifi unavailable."""
    try:
        import ssl
        import certifi
        ctx = ssl.create_default_context(cafile=certifi.where())
        return ctx
    except Exception:
        return None


def _get_redis():
    """Lazily initialize the Upstash Redis client with correct SSL handling."""
    url = os.getenv("UPSTASH_REDIS_URL")
    token = os.getenv("UPSTASH_REDIS_TOKEN")
    if not url or not token:
        return None
    try:
        from upstash_redis import Redis
        import httpx

        if not _SSL_VERIFY:
            # SSL verification disabled — use verify=False
            ssl_arg: object = False
        else:
            # Build a certifi-backed SSL context so Python finds the CA bundle
            # even on systems where the default bundle is missing or intercepted.
            ssl_ctx = _make_ssl_context()
            ssl_arg = ssl_ctx if ssl_ctx is not None else True

        # Patch httpx.Client for the duration of Redis construction so the
        # upstash_redis internal client inherits our SSL setting.
        _orig_client = httpx.Client

        class _PatchedClient(httpx.Client):
            def __init__(self, *args, **kwargs):
                kwargs["verify"] = ssl_arg
                super().__init__(*args, **kwargs)

        httpx.Client = _PatchedClient  # type: ignore[misc]
        try:
            client = Redis(url=url, token=token)
        finally:
            httpx.Client = _orig_client  # always restore

        return client
    except Exception as e:
        print(f"[KOGNIT] ✗ Redis init failed: {e}")
        return None


def _default_session() -> dict:
    return {
        "messages": [],       # [{role, content, timestamp}]
        "code_snapshot": "",  # Last known code
        "language": "",
        "last_error": None,   # Last detected error (for mastery detection)
        "created_at": time.time(),
        "updated_at": time.time(),
    }


# ── Public API ────────────────────────────────────────────────────────

def get_session(session_id: str) -> dict:
    """Retrieve or create a session."""
    redis = _get_redis()

    if redis:
        try:
            raw = redis.get(f"kognit:session:{session_id}")
            if raw:
                return json.loads(raw) if isinstance(raw, str) else raw
        except Exception as e:
            print(f"[KOGNIT] Redis read failed: {e}")

    # Fallback to in-memory
    if session_id not in _local_sessions:
        _local_sessions[session_id] = _default_session()
    return _local_sessions[session_id]


def save_session(session_id: str, session: dict) -> None:
    """Persist session state."""
    session["updated_at"] = time.time()

    # Keep only last 20 messages to avoid bloating
    if len(session.get("messages", [])) > 20:
        session["messages"] = session["messages"][-20:]

    redis = _get_redis()
    if redis:
        try:
            redis.set(
                f"kognit:session:{session_id}",
                json.dumps(session),
                ex=3600,  # Expire after 1 hour of inactivity
            )
            return
        except Exception as e:
            print(f"[KOGNIT] Redis write failed: {e}")

    # Fallback to in-memory
    _local_sessions[session_id] = session


def add_message(session_id: str, role: str, content: str) -> dict:
    """Add a message to the conversation history and return the updated session."""
    session = get_session(session_id)
    session["messages"].append({
        "role": role,
        "content": content,
        "timestamp": time.time(),
    })
    save_session(session_id, session)
    return session


def update_code_snapshot(session_id: str, code: str, language: str) -> dict:
    """Update the code snapshot in the session."""
    session = get_session(session_id)
    session["code_snapshot"] = code
    session["language"] = language
    save_session(session_id, session)
    return session


def set_last_error(session_id: str, error: Optional[str]) -> dict:
    """Track the last detected error for mastery detection."""
    session = get_session(session_id)
    session["last_error"] = error
    save_session(session_id, session)
    return session
