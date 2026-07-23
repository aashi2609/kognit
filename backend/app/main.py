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
from app.models import File
from app.language_detection import detect_language
from app.llm_router import get_available_models

import httpx

WANDBOX_API = "https://wandbox.org/api/compile.json"

# Kognit language name → Wandbox compiler name
WANDBOX_COMPILER_MAP: dict[str, str] = {
    "javascript": "nodejs-20.17.0",
    "javascript (react)": "nodejs-20.17.0",
    "typescript": "typescript-5.6.2",
    "typescript (react)": "typescript-5.6.2",
    "python": "cpython-3.14.0",
    "java": "openjdk-jdk-22+36",
    "c": "gcc-13.2.0-c",
    "c++": "gcc-13.2.0",
    "c#": "mono-6.12.0.199",
    "go": "go-1.23.2",
    "rust": "rust-1.82.0",
    "ruby": "ruby-4.0.2",
    "php": "php-8.3.12",
    "lua": "lua-5.4.7",
    "perl": "perl-5.42.0",
    "r": "r-4.4.1",
    "bash": "bash",
    "shell": "bash",
    "haskell": "ghc-9.10.1",
    "scala": "scala-3.5.1",
    "swift": "swift-6.0.1",
}


# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown hooks."""
    await init_db()
    print("[KOGNIT] ✓ Backend online")
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

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


@app.get("/files", tags=["files"], response_model=list[FileListItem])
async def list_files(db: AsyncSession = Depends(get_db)):
    """List all files for the placeholder user."""
    result = await db.execute(
        select(File)
        .where(File.user_id == DEFAULT_USER_ID)
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
async def get_file(file_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single file with its full content."""
    result = await db.execute(select(File).where(File.id == file_id))
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
async def create_file(body: FileCreate, db: AsyncSession = Depends(get_db)):
    """Create a new file. Language is auto-detected from the filename."""
    language = detect_language(body.filename)
    print(f"[KOGNIT] New file: {body.filename} → detected language: {language}")

    new_file = File(
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
async def save_file(file_id: str, body: FileSave, db: AsyncSession = Depends(get_db)):
    """Save/update file content, filename, or path. Updates language if filename changes."""
    result = await db.execute(select(File).where(File.id == file_id))
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
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a file by ID."""
    result = await db.execute(select(File).where(File.id == file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    await db.execute(delete(File).where(File.id == file_id))
    await db.commit()
    return {"success": True}


# ── Code Execution (Wandbox) ──────────────────────────────────────────

class RunCode(BaseModel):
    language: str
    content: str


@app.post("/run", tags=["execution"])
async def run_code(body: RunCode):
    """
    Execute code via the Wandbox API.
    Proxied through the backend to avoid browser CORS issues.
    Returns a normalized { run: { stdout, stderr, code } } shape.
    """
    lang_key = body.language.lower()
    compiler = WANDBOX_COMPILER_MAP.get(lang_key)
    if not compiler:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {body.language}")

    print(f"[KOGNIT] Running code: {compiler} ({len(body.content)} chars)")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                WANDBOX_API,
                json={
                    "code": body.content,
                    "compiler": compiler,
                },
            )

            if resp.status_code != 200:
                error_text = resp.text[:300]
                print(f"[KOGNIT] Wandbox error: {resp.status_code} — {error_text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Wandbox returned {resp.status_code}: {error_text}",
                )

            data = resp.json()
            print(f"[KOGNIT] Wandbox response: status={data.get('status')}, "
                  f"stdout={repr(data.get('program_output', '')[:100])}")

            # Normalize to { run: { stdout, stderr, code }, compile: { ... } }
            return {
                "run": {
                    "stdout": data.get("program_output", ""),
                    "stderr": data.get("program_error", ""),
                    "code": int(data.get("status", 0)),
                },
                "compile": {
                    "stderr": data.get("compiler_error", ""),
                    "output": data.get("compiler_output", ""),
                },
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Code execution timed out (>15s)")
    except HTTPException:
        raise  # re-raise our own
    except Exception as e:
        print(f"[KOGNIT] Run exception: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

