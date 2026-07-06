"""
Kognit Backend — Subprocess Executor

Runs code locally via system compilers (gcc, g++, javac, node, python).
Sandboxed with:
  - Strict 10s timeout
  - Isolated temp directory per run (wiped after)
  - CREATE_NO_WINDOW flag on Windows
"""

from __future__ import annotations

import asyncio
import os
import platform
import shutil
import tempfile
import time
from pathlib import Path

from app.executor.base import BaseExecutor
from app.executor.schemas import ExecutionRequest, ExecutionResult

# Windows-specific: suppress console windows for child processes
_IS_WINDOWS = platform.system() == "Windows"
_CREATION_FLAGS = 0x08000000 if _IS_WINDOWS else 0  # CREATE_NO_WINDOW

_TIMEOUT_SECONDS = 10

# ── Language Configs ──────────────────────────────────────────────────
_LANG_CONFIG: dict[str, dict] = {
    "c": {
        "filename": "main.c",
        "compile": ["gcc", "main.c", "-o", "main"],
        "run": ["./main"] if not _IS_WINDOWS else ["main.exe"],
    },
    "cpp": {
        "filename": "main.cpp",
        "compile": ["g++", "main.cpp", "-o", "main"],
        "run": ["./main"] if not _IS_WINDOWS else ["main.exe"],
    },
    "java": {
        "filename": "Main.java",
        "compile": ["javac", "Main.java"],
        "run": ["java", "Main"],
    },
    "javascript": {
        "filename": "main.js",
        "compile": None,
        "run": ["node", "main.js"],
    },
    "python": {
        "filename": "main.py",
        "compile": None,
        "run": ["python", "main.py"],
    },
}


class SubprocessExecutor(BaseExecutor):
    """Execute code in a local subprocess with timeout and cleanup."""

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        config = _LANG_CONFIG.get(request.language)
        if config is None:
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Unsupported language: {request.language}",
                duration_ms=0,
                executor="subprocess",
            )

        # Create isolated temp directory
        tmp_dir = tempfile.mkdtemp(prefix="kognit_exec_")
        try:
            return await self._run_in_sandbox(tmp_dir, config, request)
        finally:
            # Always clean up
            shutil.rmtree(tmp_dir, ignore_errors=True)

    async def _run_in_sandbox(
        self,
        work_dir: str,
        config: dict,
        request: ExecutionRequest,
    ) -> ExecutionResult:
        start = time.perf_counter()

        # Write source file
        src_path = Path(work_dir) / config["filename"]
        src_path.write_text(request.source_code, encoding="utf-8")

        # ── Compile (if needed) ───────────────────────────────────────
        if config["compile"] is not None:
            compile_result = await self._run_process(
                config["compile"], work_dir, stdin_data=""
            )
            if compile_result["exit_code"] != 0:
                elapsed = int((time.perf_counter() - start) * 1000)
                return ExecutionResult(
                    exit_code=compile_result["exit_code"],
                    stdout=compile_result["stdout"],
                    stderr=compile_result["stderr"],
                    duration_ms=elapsed,
                    executor="subprocess",
                )

        # ── Run ───────────────────────────────────────────────────────
        run_result = await self._run_process(
            config["run"], work_dir, stdin_data=request.stdin
        )
        elapsed = int((time.perf_counter() - start) * 1000)

        return ExecutionResult(
            exit_code=run_result["exit_code"],
            stdout=run_result["stdout"],
            stderr=run_result["stderr"],
            duration_ms=elapsed,
            executor="subprocess",
        )

    async def _run_process(
        self,
        cmd: list[str],
        cwd: str,
        stdin_data: str,
    ) -> dict:
        """Spawn a subprocess with timeout and capture output."""
        try:
            kwargs: dict = dict(
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
            )
            if _IS_WINDOWS:
                kwargs["creationflags"] = _CREATION_FLAGS

            proc = await asyncio.create_subprocess_exec(*cmd, **kwargs)

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(input=stdin_data.encode() if stdin_data else None),
                timeout=_TIMEOUT_SECONDS,
            )

            return {
                "exit_code": proc.returncode or 0,
                "stdout": stdout_bytes.decode(errors="replace").strip(),
                "stderr": stderr_bytes.decode(errors="replace").strip(),
            }

        except asyncio.TimeoutError:
            proc.kill()
            return {
                "exit_code": 124,
                "stdout": "",
                "stderr": f"Execution timed out after {_TIMEOUT_SECONDS}s",
            }
        except FileNotFoundError as e:
            return {
                "exit_code": 127,
                "stdout": "",
                "stderr": f"Compiler/runtime not found: {e}",
            }
