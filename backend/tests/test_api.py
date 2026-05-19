"""End-to-end tests for the KhidmatAI backend.

These run against the stubbed agents (no Gemini key needed). Once Abdul
Rehman's real agents land, the same tests should still pass — the
contracts are identical.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "KhidmatAI"
    assert body["status"] == "ok"


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["providers_loaded"] == 25
    assert "agents" in body
    # All four agents + trace logger should be reported
    assert set(body["agents"].keys()) >= {
        "agent_1_intent", "agent_2_discovery",
        "agent_3_confirmation", "agent_4_booking", "trace_logger",
    }


def test_list_providers_unfiltered(client):
    r = client.get("/providers")
    assert r.status_code == 200
    assert len(r.json()) == 25


def test_list_providers_by_service(client):
    r = client.get("/providers", params={"service_type": "Plumber"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 2
    for p in items:
        cats = [c.lower() for c in p["service_categories"]]
        assert any("plumber" in c for c in cats)


def test_analyze_english_ac(client):
    r = client.post("/analyze", json={
        "message": "I need an AC technician tomorrow morning",
        "user_lat": 33.7228,
        "user_lng": 73.0577,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["intent"]["service_type"] in {"AC Technician", "HVAC"}
    assert body["top_match"] is not None
    assert "score" in body["top_match"]
    assert body["top_match"]["score"] >= 0
    assert body["trace_url"].startswith("/api/trace/")


def test_api_request_roman_urdu_plumber(client):
    r = client.post("/api/request", json={
        "message": "Mujhe kal subah plumber chahiye, paani leak ho raha hai",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["intent"]["service_type"] == "Plumber"
    assert body["top_match"] is not None
    # alternatives ranked below top_match
    if body["alternatives"]:
        assert body["top_match"]["score"] >= body["alternatives"][0]["score"]


def test_full_booking_flow(client, tmp_path, monkeypatch):
    # Phase 1
    r1 = client.post("/api/request", json={
        "message": "Need an electrician today",
        "user_lat": 33.7100,
        "user_lng": 73.0431,
    })
    assert r1.status_code == 200
    phase1 = r1.json()
    top = phase1["top_match"]
    assert top is not None
    session_id = phase1["session_id"]
    slot = top["available_slots"][0]

    # Phase 2
    r2 = client.post("/api/book", json={
        "session_id": session_id,
        "provider_id": top["id"],
        "slot": slot,
        "user_name": "Test User",
        "user_phone": "+923001112222",
    })
    assert r2.status_code == 200, r2.text
    phase2 = r2.json()
    assert phase2["booking"]["booking_id"].startswith("BK-")
    assert phase2["booking"]["status"] == "confirmed"
    assert phase2["booking"]["provider_id"] == top["id"]
    assert phase2["receipt"]["provider"]["name"] == top["name"]

    # Trace
    r3 = client.get(f"/api/trace/{session_id}")
    assert r3.status_code == 200, r3.text
    trace = r3.json()
    agents_seen = {step["agent"] for step in trace["steps"]}
    # All four agent steps should be present in the trace
    assert "agent_1_intent" in agents_seen
    assert "agent_2_discovery" in agents_seen
    assert "agent_3_confirmation" in agents_seen
    assert "agent_4_booking" in agents_seen

    # Follow-up
    r4 = client.post("/followup", json={"booking_id": phase2["booking"]["booking_id"]})
    assert r4.status_code == 200
    actions = r4.json()["actions"]
    assert {a["action"] for a in actions} >= {"reminder", "rate_service", "rebook"}


def test_book_invalid_slot(client):
    r1 = client.post("/api/request", json={"message": "Need a plumber"})
    top = r1.json()["top_match"]
    r2 = client.post("/api/book", json={
        "session_id": r1.json()["session_id"],
        "provider_id": top["id"],
        "slot": "2099-01-01T09:00:00",  # not in available_slots
    })
    assert r2.status_code == 409


def test_book_unknown_provider(client):
    r = client.post("/api/book", json={
        "session_id": "sess-test",
        "provider_id": "P999",
        "slot": "2026-05-20T09:00:00",
    })
    assert r.status_code == 404


def test_trace_unsafe_session_id(client):
    # Path traversal attempt
    r = client.get("/api/trace/..%2F..%2Fetc%2Fpasswd")
    assert r.status_code in (404, 422)


def test_trace_unknown_session(client):
    r = client.get("/api/trace/sess-doesnotexist123")
    assert r.status_code == 404


def test_trace_includes_tool_used(client):
    """Challenge 2 §7: traces must show which tools agents used."""
    r1 = client.post("/api/request", json={"message": "Need a plumber"})
    session_id = r1.json()["session_id"]

    r2 = client.get(f"/api/trace/{session_id}")
    assert r2.status_code == 200
    steps = r2.json()["steps"]

    # Every step should declare which tool it used
    for step in steps:
        assert "tool_used" in step, f"Step missing tool_used: {step['agent']}"


def test_booking_lifecycle_complete(client):
    """Challenge 2 §6: booking → in_progress → completed flow."""
    # Create a booking
    r1 = client.post("/api/request", json={"message": "Need an electrician"})
    top = r1.json()["top_match"]
    session_id = r1.json()["session_id"]
    r2 = client.post("/api/book", json={
        "session_id": session_id,
        "provider_id": top["id"],
        "slot": top["available_slots"][0],
        "user_name": "Lifecycle Test",
    })
    booking_id = r2.json()["booking"]["booking_id"]

    # Transition: confirmed → in_progress
    r3 = client.patch(f"/api/bookings/{booking_id}/status", json={"status": "in_progress"})
    assert r3.status_code == 200
    assert r3.json()["booking"]["status"] == "in_progress"

    # Get booking — verify status persists and history is recorded
    r4 = client.get(f"/api/bookings/{booking_id}")
    assert r4.status_code == 200
    assert r4.json()["status"] == "in_progress"
    assert len(r4.json()["status_history"]) == 1
    assert r4.json()["status_history"][0]["to"] == "in_progress"

    # Mark complete
    r5 = client.patch(f"/api/bookings/{booking_id}/complete")
    assert r5.status_code == 200
    assert r5.json()["booking"]["status"] == "completed"
    assert "delivered successfully" in r5.json()["message"]


def test_status_update_invalid_value(client):
    """Reject unknown status values."""
    # First create a booking
    r1 = client.post("/api/request", json={"message": "Need a barber"})
    top = r1.json()["top_match"]
    r2 = client.post("/api/book", json={
        "session_id": r1.json()["session_id"],
        "provider_id": top["id"],
        "slot": top["available_slots"][0],
    })
    booking_id = r2.json()["booking"]["booking_id"]

    r3 = client.patch(f"/api/bookings/{booking_id}/status", json={"status": "exploded"})
    assert r3.status_code == 400


def test_complete_unknown_booking(client):
    r = client.patch("/api/bookings/BK-99999999-NOPE/complete")
    assert r.status_code == 404


def test_get_unknown_booking(client):
    r = client.get("/api/bookings/BK-99999999-NOPE")
    assert r.status_code == 404
