"""
Kognit Backend — Abstract Executor Interface

Strategy pattern base class. Concrete implementations:
  - SubprocessExecutor  (local compilers)
  - PistonExecutor      (cloud API)
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.executor.schemas import ExecutionRequest, ExecutionResult


class BaseExecutor(ABC):
    """Abstract interface for code execution backends."""

    @abstractmethod
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """
        Compile and run the submitted source code.

        Must enforce:
          - Hard timeout (10s default)
          - Temp directory cleanup
          - Stderr/stdout capture
        """
        ...


def get_executor() -> BaseExecutor:
    """Factory: returns the executor configured in .env."""
    from app.config import settings

    if settings.executor_backend == "subprocess":
        from app.executor.subprocess_exec import SubprocessExecutor
        return SubprocessExecutor()
    else:
        from app.executor.piston_exec import PistonExecutor
        return PistonExecutor()
