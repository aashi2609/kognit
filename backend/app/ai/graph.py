"""
Kognit Backend — LangGraph State Machine

Assembles the multi-agent evaluation graph:

    START → confusion_classifier → router
        ├── (score >= 0.35) → socratic_agent → tagger → mastery_calibration → END
        └── (score <  0.35) → mastery_calibration → END

Each node receives and returns a shared typed state dict.
"""

from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.ai.nodes.confusion import classify_confusion
from app.ai.nodes.mastery import confusion_to_quality, sm2_update
from app.ai.nodes.socratic import generate_socratic_response
from app.ai.nodes.tagger import tag_errors
from app.ai.router import route_after_confusion


# ── Graph State ───────────────────────────────────────────────────────

class KognitGraphState(TypedDict, total=False):
    """Shared state flowing through the evaluation graph."""
    # Inputs
    transcript_last_30s: str
    code_diff_last_45s: str
    code_context: str
    session_id: str
    user_id: str

    # Confusion classifier output
    confusion_score: float
    hesitation_markers: list[str]
    code_intent_contradictions: list[str]

    # Socratic agent output
    socratic_response: str
    escalation_level: int

    # Tagger output
    skill_tags: list[str]
    primary_tag: str
    tag_confidence: float

    # Mastery output
    mastery_delta: dict[str, Any]

    # Similar exchanges for context
    similar_exchanges: list[str]


# ── Node Functions ────────────────────────────────────────────────────

async def confusion_node(state: KognitGraphState) -> KognitGraphState:
    """Node 1: Classify confusion from transcript + code diffs."""
    result = await classify_confusion(
        transcript_last_30s=state.get("transcript_last_30s", ""),
        code_diff_last_45s=state.get("code_diff_last_45s", ""),
    )
    return {
        **state,
        "confusion_score": result["confusion_score"],
        "hesitation_markers": result["hesitation_markers"],
        "code_intent_contradictions": result["code_intent_contradictions"],
    }


async def socratic_node(state: KognitGraphState) -> KognitGraphState:
    """Node 2: Generate a Socratic question or hint."""
    result = await generate_socratic_response(
        confusion_score=state.get("confusion_score", 0.5),
        escalation_level=state.get("escalation_level", 0),
        transcript=state.get("transcript_last_30s", ""),
        code_context=state.get("code_context", ""),
        similar_exchanges=state.get("similar_exchanges"),
    )
    return {
        **state,
        "socratic_response": result["response"],
        "escalation_level": result["escalation_level"],
    }


async def tagger_node(state: KognitGraphState) -> KognitGraphState:
    """Node 3: Tag errors with taxonomy categories."""
    result = await tag_errors(
        code_context=state.get("code_context", ""),
        socratic_exchange=state.get("socratic_response", ""),
        confusion_score=state.get("confusion_score", 0.0),
    )
    return {
        **state,
        "skill_tags": result["tags"],
        "primary_tag": result["primary_tag"],
        "tag_confidence": result["confidence"],
    }


async def mastery_node(state: KognitGraphState) -> KognitGraphState:
    """Node 4: Compute SM-2 mastery update (deterministic, no DB write here)."""
    confusion = state.get("confusion_score", 0.0)
    quality = confusion_to_quality(confusion)
    primary_tag = state.get("primary_tag", "general")

    # Compute SM-2 update with defaults (actual DB write happens in the gateway)
    sm2 = sm2_update(quality, 2.5, 1, 0)

    return {
        **state,
        "mastery_delta": {
            "skill_tag": primary_tag,
            "quality": quality,
            **sm2,
        },
    }


# ── Graph Assembly ────────────────────────────────────────────────────

def build_kognit_graph() -> StateGraph:
    """
    Build and compile the Kognit evaluation graph.

    Returns a compiled LangGraph that can be invoked with:
        result = await graph.ainvoke(initial_state)
    """
    graph = StateGraph(KognitGraphState)

    # Add nodes
    graph.add_node("confusion_classifier", confusion_node)
    graph.add_node("socratic_agent", socratic_node)
    graph.add_node("tagger", tagger_node)
    graph.add_node("mastery_calibration", mastery_node)

    # Set entry point
    graph.set_entry_point("confusion_classifier")

    # Conditional edge: confusion → router → [socratic | mastery]
    graph.add_conditional_edges(
        "confusion_classifier",
        route_after_confusion,
        {
            "socratic": "socratic_agent",
            "mastery": "mastery_calibration",
        },
    )

    # Linear edges: socratic → tagger → mastery → END
    graph.add_edge("socratic_agent", "tagger")
    graph.add_edge("tagger", "mastery_calibration")
    graph.add_edge("mastery_calibration", END)

    return graph.compile()


# Singleton compiled graph
kognit_graph = build_kognit_graph()
