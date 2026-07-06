"""
Kognit Backend — Node 1: Confusion Classifier

Passes the combined transcript + code diff rolling windows
into a fast-tier LLM to compute a confusion score.
Uses structured JSON output mode via LiteLLM.
"""

from __future__ import annotations

import json
from typing import Any

import litellm

from app.ai.prompts import CONFUSION_CLASSIFIER_PROMPT
from app.config import settings


async def classify_confusion(
    transcript_last_30s: str,
    code_diff_last_45s: str,
) -> dict[str, Any]:
    """
    Compute confusion score from recent speech and code activity.

    Returns:
        {
            "confusion_score": float (0.0 - 1.0),
            "hesitation_markers": list[str],
            "code_intent_contradictions": list[str],
            "reasoning": str,
        }
    """
    user_message = (
        f"## Transcript (last 30s)\n{transcript_last_30s or '[silence]'}\n\n"
        f"## Code Changes (last 45s)\n{code_diff_last_45s or '[no changes]'}"
    )

    try:
        response = await litellm.acompletion(
            model=settings.llm_model_fast,
            messages=[
                {"role": "system", "content": CONFUSION_CLASSIFIER_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"},
        )

        raw_text = response.choices[0].message.content or "{}"
        result = json.loads(raw_text)

        # Ensure required fields exist with defaults
        return {
            "confusion_score": float(result.get("confusion_score", 0.0)),
            "hesitation_markers": result.get("hesitation_markers", []),
            "code_intent_contradictions": result.get("code_intent_contradictions", []),
            "reasoning": result.get("reasoning", ""),
        }

    except Exception as e:
        # On any failure, return a neutral score so the pipeline doesn't stall
        return {
            "confusion_score": 0.0,
            "hesitation_markers": [],
            "code_intent_contradictions": [],
            "reasoning": f"Classifier error: {e}",
        }
