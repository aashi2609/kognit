"""
Tests — AI Graph (LangGraph State Transitions)

Validates the evaluation graph with mocked LLM responses
to ensure correct routing and state flow.
"""

from __future__ import annotations

import pytest

from app.ai.nodes.mastery import confusion_to_quality, sm2_update
from app.ai.router import CONFUSION_THRESHOLD, route_after_confusion


class TestConfusionRouter:
    """Tests for the conditional routing edge."""

    def test_low_confusion_routes_to_mastery(self):
        """Confusion < 0.35 should bypass Socratic and go to mastery."""
        state = {"confusion_score": 0.2}
        assert route_after_confusion(state) == "mastery"

    def test_high_confusion_routes_to_socratic(self):
        """Confusion >= 0.35 should route to Socratic agent."""
        state = {"confusion_score": 0.5}
        assert route_after_confusion(state) == "socratic"

    def test_threshold_boundary(self):
        """Exact threshold should route to Socratic."""
        state = {"confusion_score": CONFUSION_THRESHOLD}
        assert route_after_confusion(state) == "socratic"

    def test_zero_confusion(self):
        """Zero confusion should route to mastery."""
        state = {"confusion_score": 0.0}
        assert route_after_confusion(state) == "mastery"

    def test_max_confusion(self):
        """Max confusion should route to Socratic."""
        state = {"confusion_score": 1.0}
        assert route_after_confusion(state) == "socratic"

    def test_missing_score_defaults_to_mastery(self):
        """Missing confusion_score defaults to 0.0 → mastery."""
        state = {}
        assert route_after_confusion(state) == "mastery"


class TestSM2Algorithm:
    """Tests for the SM-2 spaced repetition implementation."""

    def test_perfect_response(self):
        """Quality 5 should increase easiness and interval."""
        result = sm2_update(quality=5, easiness=2.5, interval=1, repetitions=0)
        assert result["easiness"] > 2.5
        assert result["repetitions"] == 1
        assert result["interval"] == 1  # First rep is always 1 day

    def test_second_repetition(self):
        """Second successful rep should set interval to 6 days."""
        result = sm2_update(quality=4, easiness=2.5, interval=1, repetitions=1)
        assert result["interval"] == 6
        assert result["repetitions"] == 2

    def test_third_repetition_uses_easiness(self):
        """Third+ reps multiply interval by easiness factor."""
        result = sm2_update(quality=4, easiness=2.5, interval=6, repetitions=2)
        assert result["interval"] == round(6 * result["easiness"])
        assert result["repetitions"] == 3

    def test_failed_response_resets(self):
        """Quality < 3 should reset repetitions to 0."""
        result = sm2_update(quality=2, easiness=2.5, interval=10, repetitions=5)
        assert result["repetitions"] == 0
        assert result["interval"] == 1

    def test_easiness_floor(self):
        """Easiness should never drop below 1.3."""
        result = sm2_update(quality=0, easiness=1.3, interval=1, repetitions=0)
        assert result["easiness"] >= 1.3

    def test_quality_clamping(self):
        """Quality should be clamped to 0-5 range."""
        result_high = sm2_update(quality=10, easiness=2.5, interval=1, repetitions=0)
        result_five = sm2_update(quality=5, easiness=2.5, interval=1, repetitions=0)
        assert result_high["easiness"] == result_five["easiness"]


class TestConfusionToQuality:
    """Tests for mapping confusion scores to SM-2 quality grades."""

    def test_no_confusion(self):
        """0.0 confusion → quality 5 (perfect)."""
        assert confusion_to_quality(0.0) == 5

    def test_low_confusion(self):
        """0.1 confusion → quality 4."""
        assert confusion_to_quality(0.1) == 4

    def test_medium_confusion(self):
        """0.5 confusion → quality 2."""
        assert confusion_to_quality(0.5) == 2

    def test_high_confusion(self):
        """0.8 confusion → quality 1."""
        assert confusion_to_quality(0.8) == 1

    def test_max_confusion(self):
        """1.0 confusion → quality 0 (blackout)."""
        assert confusion_to_quality(1.0) == 0
