"""
Kognit Backend — FastAPI Application

File CRUD endpoints backed by Neon Postgres,
multi-LLM model availability, and health checks.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import init_db, get_db
from app.models import File, SkillMastery, ArenaSession
from app.language_detection import detect_language
from app.llm_router import get_available_models
from app.auth import get_current_user

import httpx

# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown hooks."""
    await init_db()
    print("[KOGNIT] ✓ Backend online")
    
    # Pre-fetch Piston runtimes cache
    try:
        from app.code_runner import get_piston_runtimes
        await get_piston_runtimes()
        print("[KOGNIT] ✓ Piston runtimes cached")
    except Exception as e:
        print(f"[KOGNIT] ✗ Failed to cache Piston runtimes: {e}")
        
    yield
    print("[KOGNIT] Shutting down...")


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kognit — Socratic Coaching Engine",
    description="File management and multi-LLM routing for the Kognit coding tutor.",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Schemas ──────────────────────────────────────────────────

class FileCreate(BaseModel):
    filename: str
    folder_path: str = "/"


class FileSave(BaseModel):
    content: str | None = None
    filename: str | None = None
    folder_path: str | None = None


class FileResponse(BaseModel):
    id: str
    filename: str
    folder_path: str
    language: str | None
    content: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class FileListItem(BaseModel):
    id: str
    filename: str
    folder_path: str
    language: str | None

    model_config = {"from_attributes": True}


# ── Health ────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    """Basic health probe."""
    return {"status": "ok", "service": "kognit-backend"}


# ── Models ────────────────────────────────────────────────────────────

@app.get("/models", tags=["llm"])
async def available_models():
    """Returns which LLM models are usable based on present API keys."""
    return {"models": get_available_models()}


# ── File CRUD ─────────────────────────────────────────────────────────


@app.get("/files", tags=["files"], response_model=list[FileListItem])
async def list_files(db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    """List all files for the authenticated user."""
    result = await db.execute(
        select(File)
        .where(File.user_id == user_id)
        .order_by(File.created_at)
    )
    files = result.scalars().all()
    return [
        FileListItem(
            id=str(f.id),
            filename=f.filename,
            folder_path=f.folder_path,
            language=f.language,
        )
        for f in files
    ]


@app.get("/files/{file_id}", tags=["files"], response_model=FileResponse)
async def get_file(file_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    """Get a single file with its full content."""
    result = await db.execute(select(File).where(File.id == file_id, File.user_id == user_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        id=str(file.id),
        filename=file.filename,
        folder_path=file.folder_path,
        language=file.language,
        content=file.content,
        created_at=file.created_at.isoformat(),
        updated_at=file.updated_at.isoformat(),
    )


@app.post("/files", tags=["files"], response_model=FileResponse, status_code=201)
async def create_file(body: FileCreate, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    """Create a new file. Language is auto-detected from the filename."""
    language = detect_language(body.filename)
    print(f"[KOGNIT] New file: {body.filename} → detected language: {language} for user {user_id}")

    new_file = File(
        user_id=user_id,
        filename=body.filename,
        folder_path=body.folder_path,
        language=language,
        content="",
    )
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)

    return FileResponse(
        id=str(new_file.id),
        filename=new_file.filename,
        folder_path=new_file.folder_path,
        language=new_file.language,
        content=new_file.content,
        created_at=new_file.created_at.isoformat(),
        updated_at=new_file.updated_at.isoformat(),
    )


@app.put("/files/{file_id}", tags=["files"])
async def save_file(file_id: str, body: FileSave, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    """Save/update file content, filename, or path. Updates language if filename changes."""
    result = await db.execute(select(File).where(File.id == file_id, File.user_id == user_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.content is not None:
        updates["content"] = body.content
    if body.filename is not None and body.filename.strip():
        new_name = body.filename.strip()
        updates["filename"] = new_name
        updates["language"] = detect_language(new_name)
    if body.folder_path is not None:
        updates["folder_path"] = body.folder_path

    await db.execute(
        update(File)
        .where(File.id == file_id)
        .values(**updates)
    )
    await db.commit()

    updated_filename = updates.get("filename", file.filename)
    updated_lang = updates.get("language", file.language)
    return {
        "success": True,
        "id": file_id,
        "filename": updated_filename,
        "language": updated_lang,
    }


@app.delete("/files/{file_id}", tags=["files"])
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    """Delete a file by ID."""
    result = await db.execute(select(File).where(File.id == file_id, File.user_id == user_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    await db.execute(delete(File).where(File.id == file_id))
    await db.commit()
    return {"success": True}


# ── Skills & Arena ────────────────────────────────────────────────────

@app.get("/skills", tags=["skills"])
async def get_skills(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SkillMastery)
        .where(SkillMastery.user_id == user_id)
        .order_by(SkillMastery.last_practiced_at.desc())
    )
    skills = result.scalars().all()
    return skills

@app.get("/arena", tags=["arena"])
async def get_arena_sessions(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ArenaSession)
        .where(ArenaSession.user_id == user_id)
        .order_by(ArenaSession.started_at.desc())
    )
    sessions = result.scalars().all()
    return sessions


# ── Code Execution & Parsing (Piston/Wandbox) ───────────────────────────────────

from app.code_runner import execute_code, get_piston_runtimes
from app.input_extractor import extract_input_prompts

class ExtractPromptsRequest(BaseModel):
    language: str
    content: str

@app.post("/extract-prompts", tags=["execution"])
async def extract_prompts(body: ExtractPromptsRequest, user_id: str = Depends(get_current_user)):
    """
    Parse source code to find expected standard input prompts.
    Returns a list of labels (e.g. ['Enter name:', 'Enter age:']).
    """
    prompts = extract_input_prompts(body.language, body.content)
    return {"prompts": prompts}

class RunCode(BaseModel):
    language: str
    content: str
    filename: str = ""
    stdin: str = ""

@app.post("/run", tags=["execution"])
async def run_code(body: RunCode, user_id: str = Depends(get_current_user)):
    """
    Execute code via the Piston API.
    Proxied through the backend to avoid browser CORS issues.
    Returns a normalized { run: { stdout, stderr, code }, compile: { ... } } shape.
    """
    return await execute_code(body.language, body.content, body.filename, body.stdin)


# ── WebSocket Gateway (Real-time Voice Tutor) ─────────────────────────

from fastapi import WebSocket
from app.ws_gateway import handle_websocket

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Real-time bidirectional channel for the AI tutor.
    Handles code_update, audio_in, and audio_out events.
    """
    await handle_websocket(websocket, session_id)
