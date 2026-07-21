"""
Kognit Backend — SQLAlchemy Models

The files table stores user code files with auto-detected language.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Text, DateTime, text
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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        default=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        server_default=text("'00000000-0000-0000-0000-000000000001'::uuid"),
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
