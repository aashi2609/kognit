"""
Kognit Backend — Async Database Engine

Uses SQLAlchemy async with asyncpg to connect to Neon Postgres.
Tables are created automatically on startup via init_db().
"""

from __future__ import annotations

import os
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Neon requires SSL — asyncpg needs ?ssl=require in the URL
# Convert postgresql:// to postgresql+asyncpg:// if user pastes the raw Neon URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# Ensure SSL is present for Neon
if "sslmode=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")
elif DATABASE_URL and "ssl" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{separator}ssl=require"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
) if DATABASE_URL else None

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
) if engine else None


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables. Called once on app startup."""
    if engine is None:
        print("[KOGNIT] ⚠ No DATABASE_URL set — skipping DB init")
        return
    async with engine.begin() as conn:
        from app.models import File  # noqa: F401 — ensure model is registered
        await conn.run_sync(Base.metadata.create_all)
    print("[KOGNIT] ✓ Database tables ready")


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not configured — set DATABASE_URL in .env")
    async with AsyncSessionLocal() as session:
        yield session
