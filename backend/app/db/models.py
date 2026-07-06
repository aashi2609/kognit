"""
Kognit Backend — SQLAlchemy ORM Models

Defines the core database schema:
  - User          : authentication identity
  - Session       : a single coaching session
  - MasteryLedger : SM-2 spaced-repetition state per skill
  - SocraticExchange : individual Q&A turns with embeddings
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# ── Base ──────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Shared declarative base for all models."""
    pass


# ── Enums ─────────────────────────────────────────────────────────────
class SkillTag(str, enum.Enum):
    """Fixed taxonomy of error / skill categories."""
    OFF_BY_ONE = "off_by_one"
    NULL_DEREF = "null_deref"
    SCOPE_ERROR = "scope_error"
    TYPE_MISMATCH = "type_mismatch"
    LOGIC_INVERSION = "logic_inversion"
    INFINITE_LOOP = "infinite_loop"
    BOUNDARY_CONDITION = "boundary_condition"
    RECURSION_BASE_CASE = "recursion_base_case"
    MEMORY_MANAGEMENT = "memory_management"
    CONCURRENCY = "concurrency"
    DATA_STRUCTURE_CHOICE = "data_structure_choice"
    ALGORITHM_COMPLEXITY = "algorithm_complexity"
    SORTING = "sorting"
    SEARCHING = "searching"
    GRAPH_TRAVERSAL = "graph_traversal"
    DYNAMIC_PROGRAMMING = "dynamic_programming"
    TREE_OPERATIONS = "tree_operations"
    STRING_MANIPULATION = "string_manipulation"
    BIT_MANIPULATION = "bit_manipulation"
    GENERAL = "general"


# ── User ──────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    sessions: Mapped[list[CodingSession]] = relationship(back_populates="user", cascade="all, delete-orphan")
    mastery_entries: Mapped[list[MasteryLedger]] = relationship(back_populates="user", cascade="all, delete-orphan")


# ── Session ───────────────────────────────────────────────────────────
class CodingSession(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)

    # Relationships
    user: Mapped[User] = relationship(back_populates="sessions")
    exchanges: Mapped[list[SocraticExchange]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


# ── Mastery Ledger ────────────────────────────────────────────────────
class MasteryLedger(Base):
    """SM-2 spaced-repetition state for each user × skill pair."""
    __tablename__ = "mastery_ledger"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    skill_tag: Mapped[SkillTag] = mapped_column(Enum(SkillTag), nullable=False, index=True)
    easiness_factor: Mapped[float] = mapped_column(Float, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_delta: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped[User] = relationship(back_populates="mastery_entries")


# ── Socratic Exchange ─────────────────────────────────────────────────
class SocraticExchange(Base):
    """An individual Q&A turn within a coaching session."""
    __tablename__ = "socratic_exchanges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    user_message: Mapped[str] = mapped_column(Text, nullable=False)
    agent_response: Mapped[str] = mapped_column(Text, nullable=False)
    confusion_score: Mapped[float] = mapped_column(Float, default=0.0)
    embedding = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    session: Mapped[CodingSession] = relationship(back_populates="exchanges")
