"""
Kognit Backend — SQLAlchemy Models
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, DateTime, text, Float, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    folder_path: Mapped[str] = mapped_column(
        Text,
        default="/",
        server_default=text("'/'"),
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", server_default=text("''"))
    language: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SkillMastery(Base):
    __tablename__ = "skill_mastery"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    concept_tag: Mapped[str] = mapped_column(Text, nullable=False)
    mastery_level: Mapped[float] = mapped_column(Float, default=0.0, server_default=text("0.0"))
    xp: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    confusion_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    resolved_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    last_practiced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "concept_tag", name="uq_skill_mastery_user_concept"),
    )


class ArenaSession(Base):
    __tablename__ = "arena_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="SET NULL"),
        nullable=True,
    )
    language: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    errors_encountered: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    errors_resolved: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    hints_given: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
