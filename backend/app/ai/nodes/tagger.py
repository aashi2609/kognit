"""
Kognit Backend — Node 3: Error Taxonomy Tagger

Maps verified errors against the fixed SkillTag taxonomy enum.
Uses the fast-tier LLM with structured JSON output.
"""

from __future__ import annotations

import json
from typing import Any

import litellm

from app.ai.prompts import TAGGER_PROMPT
from app.config import settings
from app.db.models import SkillTag


# Valid tag strings for validation
_VALID_TAGS = {tag.value for tag in SkillTag}


async def tag_errors(
    code_context: str,
    socratic_exchange: str,
    confusion_score: float,
) -> dict[str, Any]:
    """
    Classify the student's error(s) into taxonomy categories.

    Returns:
        {
            "tags": list[str],        # All matching taxonomy tags
            "primary_tag": str,       # Most relevant tag
            "confidence": float,      # 0.0 - 1.0
        }
    """
    user_message = (
        f"## Code\n```\n{code_context or '[no code]'}\n```\n\n"
        f"## Socratic Exchange\n{socratic_exchange}\n\n"
        f"## Confusion Score: {confusion_score:.2f}"
    )

    try:
        response = await litellm.acompletion(
            model=settings.llm_model_fast,
            messages=[
                {"role": "system", "content": TAGGER_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=200,
            response_format={"type": "json_object"},
        )

        raw_text = response.choices[0].message.content or "{}"
        result = json.loads(raw_text)

        # Validate tags against our enum
        raw_tags = result.get("tags", ["general"])
        validated_tags = [t.lower() for t in raw_tags if t.lower() in _VALID_TAGS]
        if not validated_tags:
            validated_tags = ["general"]

        primary = result.get("primary_tag", validated_tags[0]).lower()
        if primary not in _VALID_TAGS:
            primary = validated_tags[0]

        return {
            "tags": validated_tags,
            "primary_tag": primary,
            "confidence": float(result.get("confidence", 0.5)),
        }

    except Exception as e:
        return {
            "tags": ["general"],
            "primary_tag": "general",
            "confidence": 0.0,
        }
