"""
Tests — WebSocket Gateway

Validates WebSocket protocol round-trips including
code updates, execution requests, and error handling.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestWebSocketGateway:
    """Tests for the unified WebSocket endpoint."""

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_websocket_connect_and_receive_ack(self, client):
        """Verify WebSocket connects and receives initial confusion_update."""
        with client.websocket_connect("/ws/test-session-001") as ws:
            # Should receive an initial acknowledgement
            data = ws.receive_json()
            assert data["type"] == "confusion_update"
            assert data["payload"]["status"] == "connected"
            assert data["payload"]["confusion_score"] == 0.0

    def test_websocket_invalid_json(self, client):
        """Verify invalid JSON returns an error message."""
        with client.websocket_connect("/ws/test-session-002") as ws:
            _ = ws.receive_json()  # consume ack
            ws.send_text("not valid json")
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "Invalid JSON" in response["payload"]["message"]

    def test_websocket_unknown_message_type(self, client):
        """Verify unknown message types return an error."""
        with client.websocket_connect("/ws/test-session-003") as ws:
            _ = ws.receive_json()  # consume ack
            ws.send_json({"type": "unknown_type", "data": "test"})
            response = ws.receive_json()
            assert response["type"] == "error"
            assert "Unknown message type" in response["payload"]["message"]

    def test_websocket_code_update(self, client):
        """Verify code_update messages are accepted without error."""
        with client.websocket_connect("/ws/test-session-004") as ws:
            _ = ws.receive_json()  # consume ack
            ws.send_json({
                "type": "code_update",
                "file_name": "test.py",
                "language": "python",
                "content": "print('hello')",
                "cursor_line": 1,
            })
            # code_update doesn't send a response — connection stays alive
            # Just verify no error by sending another message
            ws.send_json({
                "type": "code_update",
                "file_name": "test.py",
                "language": "python",
                "content": "print('updated')",
                "cursor_line": 1,
            })
