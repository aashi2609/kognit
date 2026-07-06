"""
Kognit Backend — Mastery Ledger REST API

Read-only endpoints for querying mastery state.
Write operations happen via the LangGraph pipeline (Node 4).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db.models import MasteryLedger

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class MasteryEntry(BaseModel):
    skill_tag: str
    easiness_factor: float
    interval_days: int
    repetitions: int
    next_review: str
    last_delta: float


class MasteryOverview(BaseModel):
    user_id: str
    total_skills: int
    average_easiness: float
    entries: list[MasteryEntry]


# ── Routes ────────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=MasteryOverview)
async def get_mastery(user_id: str, session: AsyncSession = Depends(get_session)):
    """Get the full mastery overview for a user."""
    result = await session.execute(
        select(MasteryLedger).where(MasteryLedger.user_id == user_id)
    )
    entries = result.scalars().all()

    if not entries:
        return MasteryOverview(
            user_id=user_id,
            total_skills=0,
            average_easiness=2.5,
            entries=[],
        )

    mastery_entries = [
        MasteryEntry(
            skill_tag=e.skill_tag.value,
            easiness_factor=e.easiness_factor,
            interval_days=e.interval_days,
            repetitions=e.repetitions,
            next_review=e.next_review.isoformat(),
            last_delta=e.last_delta,
        )
        for e in entries
    ]

    avg_easiness = sum(e.easiness_factor for e in entries) / len(entries)

    return MasteryOverview(
        user_id=user_id,
        total_skills=len(entries),
        average_easiness=round(avg_easiness, 4),
        entries=mastery_entries,
    )


@router.get("/{user_id}/{skill_tag}", response_model=MasteryEntry)
async def get_skill_mastery(
    user_id: str,
    skill_tag: str,
    session: AsyncSession = Depends(get_session),
):
    """Get mastery for a specific skill."""
    result = await session.execute(
        select(MasteryLedger).where(
            MasteryLedger.user_id == user_id,
            MasteryLedger.skill_tag == skill_tag,
        )
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail=f"No mastery data for skill: {skill_tag}")

    return MasteryEntry(
        skill_tag=entry.skill_tag.value,
        easiness_factor=entry.easiness_factor,
        interval_days=entry.interval_days,
        repetitions=entry.repetitions,
        next_review=entry.next_review.isoformat(),
        last_delta=entry.last_delta,
    )
