"""
Kognit Backend — Node 4: SM-2 Mastery Calibration

Deterministic spaced-repetition algorithm (SM-2) that computes
updated mastery values based on user performance quality.
Writes the delta directly to Postgres via the MasteryLedger model.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import MasteryLedger, SkillTag


def sm2_update(
    quality: int,
    easiness: float,
    interval: int,
    repetitions: int,
) -> dict[str, Any]:
    """
    Pure SM-2 algorithm implementation.

    Args:
        quality: Performance grade (0-5).
            0 = complete blackout
            1 = incorrect, but remembered on seeing answer
            2 = incorrect, but easy to recall
            3 = correct with serious difficulty
            4 = correct with minor hesitation
            5 = perfect response
        easiness: Current easiness factor (>= 1.3).
        interval: Current interval in days.
        repetitions: Current repetition count.

    Returns:
        {
            "easiness": float,
            "interval": int,
            "repetitions": int,
            "delta": float,   # change in easiness for tracking
        }
    """
    # Clamp quality
    quality = max(0, min(5, quality))

    # Calculate new easiness factor
    new_easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_easiness = max(1.3, new_easiness)  # Floor at 1.3

    delta = new_easiness - easiness

    if quality < 3:
        # Failed — reset repetitions
        new_repetitions = 0
        new_interval = 1
    else:
        # Passed
        new_repetitions = repetitions + 1
        if new_repetitions == 1:
            new_interval = 1
        elif new_repetitions == 2:
            new_interval = 6
        else:
            new_interval = round(interval * new_easiness)

    return {
        "easiness": round(new_easiness, 4),
        "interval": new_interval,
        "repetitions": new_repetitions,
        "delta": round(delta, 4),
    }


def confusion_to_quality(confusion_score: float) -> int:
    """
    Map a confusion score (0.0 - 1.0) to an SM-2 quality grade (0-5).

    Low confusion = high quality (student is doing well).
    High confusion = low quality (student is struggling).
    """
    if confusion_score >= 0.85:
        return 0
    elif confusion_score >= 0.7:
        return 1
    elif confusion_score >= 0.55:
        return 2
    elif confusion_score >= 0.4:
        return 3
    elif confusion_score >= 0.2:
        return 4
    else:
        return 5


async def update_mastery(
    session: AsyncSession,
    user_id: uuid.UUID,
    skill_tag: str,
    confusion_score: float,
) -> dict[str, Any]:
    """
    Update the mastery ledger for a user × skill pair.

    Computes the SM-2 update based on the confusion trajectory
    and writes the delta to Postgres.

    Returns the updated mastery state.
    """
    # Convert string to enum
    try:
        tag_enum = SkillTag(skill_tag)
    except ValueError:
        tag_enum = SkillTag.GENERAL

    # Find or create the mastery entry
    query = select(MasteryLedger).where(
        MasteryLedger.user_id == user_id,
        MasteryLedger.skill_tag == tag_enum,
    )
    result = await session.execute(query)
    entry = result.scalar_one_or_none()

    quality = confusion_to_quality(confusion_score)

    if entry is None:
        # First encounter with this skill — create entry
        sm2 = sm2_update(quality, 2.5, 1, 0)
        entry = MasteryLedger(
            user_id=user_id,
            skill_tag=tag_enum,
            easiness_factor=sm2["easiness"],
            interval_days=sm2["interval"],
            repetitions=sm2["repetitions"],
            last_delta=sm2["delta"],
            next_review=datetime.now(timezone.utc) + timedelta(days=sm2["interval"]),
        )
        session.add(entry)
    else:
        # Update existing entry
        sm2 = sm2_update(
            quality,
            entry.easiness_factor,
            entry.interval_days,
            entry.repetitions,
        )
        entry.easiness_factor = sm2["easiness"]
        entry.interval_days = sm2["interval"]
        entry.repetitions = sm2["repetitions"]
        entry.last_delta = sm2["delta"]
        entry.next_review = datetime.now(timezone.utc) + timedelta(days=sm2["interval"])

    await session.flush()

    return {
        "skill_tag": tag_enum.value,
        "easiness_factor": entry.easiness_factor,
        "interval_days": entry.interval_days,
        "repetitions": entry.repetitions,
        "next_review": entry.next_review.isoformat(),
        "delta": sm2["delta"],
        "quality": quality,
    }
