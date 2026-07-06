"""
Kognit Backend — Pydantic Settings

Loads configuration from `.env` file or environment variables.
All secrets, connection strings, and feature toggles live here.
"""

from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://kognit:kognit_secret@localhost:5432/kognit_db"

    # ── Redis ─────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Code Executor ─────────────────────────────────────────────────
    executor_backend: Literal["subprocess", "piston"] = "piston"

    # ── LLM (via LiteLLM) ────────────────────────────────────────────
    llm_model_fast: str = "gemini/gemini-2.0-flash"
    llm_model_strong: str = "gemini/gemini-2.0-flash"

    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # ── Transcription ─────────────────────────────────────────────────
    stt_backend: Literal["local", "deepgram", "google"] = "local"
    whisper_model_size: str = "base.en"
    deepgram_api_key: str = ""

    # ── Auth ──────────────────────────────────────────────────────────
    jwt_secret_key: str = "change-me-to-a-random-64-char-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # ── Server ────────────────────────────────────────────────────────
    backend_cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",")]


settings = Settings()
