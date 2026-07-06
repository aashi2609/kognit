"""
Kognit Backend — Execution Request / Result Schemas
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ExecutionRequest(BaseModel):
    """Payload submitted for code execution."""
    language: Literal["c", "cpp", "java", "javascript", "python"]
    source_code: str
    stdin: str = ""


class ExecutionResult(BaseModel):
    """Result returned after code execution."""
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    executor: Literal["subprocess", "piston"]
