"""
Kognit Backend — Node 2: Socratic Agent

Generates a single Socratic question (or escalated hint) based on
confusion level, transcript context, and code state.
Uses the strong-tier LLM with strict prompt enforcement.
"""

from __future__ import annotations

import litellm

from app.ai.prompts import SOCRATIC_AGENT_PROMPT
from app.config import settings


async def generate_socratic_response(
    confusion_score: float,
    escalation_level: int,
    transcript: str,
    code_context: str,
    similar_exchanges: list[str] | None = None,
) -> dict[str, str | int]:
    """
    Generate a Socratic question or escalated hint.

    Args:
        confusion_score: Current confusion level (0.0 - 1.0).
        escalation_level: How many times we've looped (0-5+).
        transcript: Recent student speech.
        code_context: Current code snapshot.
        similar_exchanges: Past Q&A for continuity.

    Returns:
        {
            "response": str,       # The Socratic question or hint
            "escalation_level": int # Updated escalation counter
        }
    """
    # Build context for the LLM
    exchange_context = ""
    if similar_exchanges:
        exchange_context = "\n## Previous Exchanges\n" + "\n".join(
            f"- {ex}" for ex in similar_exchanges[-3:]
        )

    user_message = (
        f"## Confusion Score: {confusion_score:.2f}\n"
        f"## Escalation Level: {escalation_level}\n\n"
        f"## Student Transcript\n{transcript or '[silence]'}\n\n"
        f"## Student Code\n```\n{code_context or '[no code]'}\n```"
        f"{exchange_context}"
    )

    try:
        response = await litellm.acompletion(
            model=settings.llm_model_strong,
            messages=[
                {"role": "system", "content": SOCRATIC_AGENT_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=100,
        )

        question = (response.choices[0].message.content or "").strip()

        # Increment escalation level for next round
        new_escalation = min(escalation_level + 1, 5)

        return {
            "response": question,
            "escalation_level": new_escalation,
        }

    except Exception as e:
        return {
            "response": f"[Socratic Agent error: {e}]",
            "escalation_level": escalation_level,
        }
