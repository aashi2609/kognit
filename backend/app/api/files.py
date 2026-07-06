"""
Kognit Backend — Project Files REST API

CRUD endpoints for managing user project files.
Files are stored in-memory for now (Phase 1 — frontend only).
Will be persisted to Postgres in a future migration.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class FileCreate(BaseModel):
    name: str
    language: str
    content: str = ""


class FileUpdate(BaseModel):
    name: str | None = None
    language: str | None = None
    content: str | None = None


class FileResponse(BaseModel):
    id: str
    name: str
    language: str
    content: str
    created_at: str
    updated_at: str


# ── In-memory store (will migrate to Postgres) ───────────────────────
# Keyed by user_id → list of files
_file_store: dict[str, list[dict[str, Any]]] = {}


def _get_user_files(user_id: str) -> list[dict[str, Any]]:
    if user_id not in _file_store:
        # Seed with default files
        _file_store[user_id] = [
            {
                "id": str(uuid4()),
                "name": "mergeSort.js",
                "language": "javascript",
                "content": (
                    "function mergeSort(arr) {\n"
                    "  if (arr.length <= 1) return arr;\n"
                    "  const mid = Math.floor(arr.length / 2);\n"
                    "  const left = mergeSort(arr.slice(0, mid));\n"
                    "  const right = mergeSort(arr.slice(mid));\n"
                    "  return merge(left, right);\n"
                    "}\n"
                ),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": str(uuid4()),
                "name": "CoreProcessor.java",
                "language": "java",
                "content": (
                    'import java.util.stream.Stream;\n\n'
                    'public class CoreProcessor {\n'
                    '    public static void main(String[] args) {\n'
                    '        Stream.of(args).forEach(System.out::println);\n'
                    '    }\n'
                    '}\n'
                ),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "id": str(uuid4()),
                "name": "main.c",
                "language": "c",
                "content": (
                    '#include <stdio.h>\n\n'
                    'int main() {\n'
                    '    printf("Hello, Kognit!\\n");\n'
                    '    return 0;\n'
                    '}\n'
                ),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
    return _file_store[user_id]


# ── Routes ────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=list[FileResponse])
async def list_files(user_id: str):
    """List all project files for a user."""
    return _get_user_files(user_id)


@router.post("/{user_id}", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def create_file(user_id: str, body: FileCreate):
    """Create a new project file."""
    files = _get_user_files(user_id)
    now = datetime.now(timezone.utc).isoformat()
    new_file = {
        "id": str(uuid4()),
        "name": body.name,
        "language": body.language,
        "content": body.content,
        "created_at": now,
        "updated_at": now,
    }
    files.append(new_file)
    return new_file


@router.put("/{user_id}/{file_id}", response_model=FileResponse)
async def update_file(user_id: str, file_id: str, body: FileUpdate):
    """Update an existing project file."""
    files = _get_user_files(user_id)
    for f in files:
        if f["id"] == file_id:
            if body.name is not None:
                f["name"] = body.name
            if body.language is not None:
                f["language"] = body.language
            if body.content is not None:
                f["content"] = body.content
            f["updated_at"] = datetime.now(timezone.utc).isoformat()
            return f
    raise HTTPException(status_code=404, detail="File not found")


@router.delete("/{user_id}/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(user_id: str, file_id: str):
    """Delete a project file."""
    files = _get_user_files(user_id)
    for i, f in enumerate(files):
        if f["id"] == file_id:
            files.pop(i)
            return
    raise HTTPException(status_code=404, detail="File not found")
