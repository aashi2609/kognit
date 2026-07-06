"""
Kognit Backend — FastAPI Application Entry Point

Mounts all routers, sets up CORS, and exposes lifespan events
for initialising/tearing-down database and cache connections.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown hooks."""
    # --- Startup ---
    # Database engine & tables are created lazily on first request
    # Redis connection pool is created lazily on first use
    print("[KOGNIT] ✓ Backend online")
    yield
    # --- Shutdown ---
    print("[KOGNIT] Shutting down...")


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kognit — Socratic Coaching Engine",
    description="Real-time Socratic AI backend with multiplexed WebSocket pipeline.",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    """Basic health probe."""
    return {"status": "ok", "service": "kognit-backend"}


# ── Mount Routers ─────────────────────────────────────────────────────
# REST API
from app.api.auth import router as auth_router  # noqa: E402
from app.api.files import router as files_router  # noqa: E402
from app.api.mastery import router as mastery_router  # noqa: E402

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(files_router, prefix="/api/files", tags=["files"])
app.include_router(mastery_router, prefix="/api/mastery", tags=["mastery"])

# WebSocket
from app.ws.gateway import router as ws_router  # noqa: E402

app.include_router(ws_router, tags=["websocket"])


# ── Executor Health ───────────────────────────────────────────────────
@app.get("/health/executor", tags=["system"])
async def executor_health():
    """Reports which code execution languages are available."""
    import shutil

    compilers = {
        "c": shutil.which("gcc") is not None,
        "cpp": shutil.which("g++") is not None,
        "java": shutil.which("javac") is not None,
        "javascript": shutil.which("node") is not None,
        "python": shutil.which("python") is not None or shutil.which("python3") is not None,
    }
    return {
        "executor_backend": settings.executor_backend,
        "languages": compilers,
    }
