"""
Kognit Backend — Conditional Router Edge

The gate between the Confusion Classifier and the rest of the graph.
If confusion is low (< 0.35), bypass the expensive Socratic LLM
and jump directly to mastery calibration.
"""

from __future__ import annotations

from typing import Any

# Threshold below which we skip Socratic intervention
CONFUSION_THRESHOLD = 0.35


def route_after_confusion(state: dict[str, Any]) -> str:
    """
    Conditional edge function for LangGraph.

    Returns:
        "socratic" if confusion >= threshold (student needs help)
        "mastery"  if confusion < threshold  (student is fine)
    """
    score = state.get("confusion_score", 0.0)

    if score >= CONFUSION_THRESHOLD:
        return "socratic"
    else:
        return "mastery"
