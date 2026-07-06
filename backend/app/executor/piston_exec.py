"""
Kognit Backend — Piston API Executor

Sends code to the free Piston execution engine (https://emkc.org).
Zero local setup required. Supports 70+ languages.
"""

from __future__ import annotations

import time

import httpx

from app.executor.base import BaseExecutor
from app.executor.schemas import ExecutionRequest, ExecutionResult

_PISTON_URL = "https://emkc.org/api/v2/piston/execute"

# Map our language names to Piston's expected identifiers + versions
_PISTON_LANG_MAP: dict[str, dict[str, str]] = {
    "c": {"language": "c", "version": "10.2.0"},
    "cpp": {"language": "c++", "version": "10.2.0"},
    "java": {"language": "java", "version": "15.0.2"},
    "javascript": {"language": "javascript", "version": "18.15.0"},
    "python": {"language": "python", "version": "3.10.0"},
}


class PistonExecutor(BaseExecutor):
    """Execute code via the Piston cloud API."""

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        lang_config = _PISTON_LANG_MAP.get(request.language)
        if lang_config is None:
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Unsupported language for Piston: {request.language}",
                duration_ms=0,
                executor="piston",
            )

        payload = {
            "language": lang_config["language"],
            "version": lang_config["version"],
            "files": [
                {
                    "name": f"main.{_file_ext(request.language)}",
                    "content": request.source_code,
                }
            ],
            "stdin": request.stdin,
            "compile_timeout": 10000,
            "run_timeout": 10000,
            "compile_memory_limit": -1,
            "run_memory_limit": -1,
        }

        start = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(_PISTON_URL, json=payload)
                response.raise_for_status()
                data = response.json()

            elapsed = int((time.perf_counter() - start) * 1000)

            # Piston returns { "run": { "stdout", "stderr", "code" }, "compile": ... }
            run_data = data.get("run", {})
            compile_data = data.get("compile", {})

            # If compilation failed, report that
            if compile_data and compile_data.get("code", 0) != 0:
                return ExecutionResult(
                    exit_code=compile_data.get("code", 1),
                    stdout=compile_data.get("stdout", ""),
                    stderr=compile_data.get("stderr", "Compilation failed"),
                    duration_ms=elapsed,
                    executor="piston",
                )

            return ExecutionResult(
                exit_code=run_data.get("code", 0),
                stdout=run_data.get("stdout", "").strip(),
                stderr=run_data.get("stderr", "").strip(),
                duration_ms=elapsed,
                executor="piston",
            )

        except httpx.HTTPStatusError as e:
            elapsed = int((time.perf_counter() - start) * 1000)
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Piston API error: {e.response.status_code} — {e.response.text[:200]}",
                duration_ms=elapsed,
                executor="piston",
            )
        except httpx.RequestError as e:
            elapsed = int((time.perf_counter() - start) * 1000)
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Piston API connection error: {e}",
                duration_ms=elapsed,
                executor="piston",
            )


def _file_ext(language: str) -> str:
    """Map language to file extension."""
    return {
        "c": "c",
        "cpp": "cpp",
        "java": "java",
        "javascript": "js",
        "python": "py",
    }.get(language, "txt")
