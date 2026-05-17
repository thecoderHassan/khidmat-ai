"""
Agent 1 — Intent Agent
Parses natural language input (Urdu / Roman Urdu / English) via Gemini API.
Extracts: service_type, location, time_preference, language_detected.
"""

import os
import json
import time
from datetime import datetime, timezone

from google import genai
from dotenv import load_dotenv

from utils.logger import write_trace
from utils.helpers import normalize_time

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SERVICE_CATEGORIES = [
    "AC Technician", "Plumber", "Electrician", "Tutor",
    "Beautician", "Carpenter", "Painter", "Driver", "Maid", "Delivery Worker",
]

_PROMPT = f"""You are an intent parser for a Pakistani home services app.
Extract the service request details from the user message.

The user may write in Urdu (اردو), Roman Urdu, English, or a mix of these.

Return ONLY a valid JSON object — no markdown, no explanation:
{{
  "service_type": "<one of the 10 categories, or null>",
  "location": "<area/sector name, or null>",
  "time_preference": "<when they want the service, or null>",
  "language_detected": "<Urdu | Roman Urdu | English | Mixed>"
}}

Valid service_type values (pick the closest match):
{", ".join(SERVICE_CATEGORIES)}

Rules:
- service_type must be exactly one of those 10 values, or null if unclear
- location: extract area/sector (e.g. "G-13", "F-7", "I-8", "Blue Area")
- time_preference: human-readable (e.g. "Tomorrow morning", "Today evening", "ASAP")
- language_detected: dominant language in the message
"""


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: {
            "message": "Mujhe kal subah G-13 mein AC technician chahiye",
            "session_id": "SES-20250517-001"   # optional
        }

    Returns:
        {
            "service_type": "AC Technician",
            "location": "G-13",
            "time_preference": "Tomorrow morning",
            "language_detected": "Roman Urdu"
        }
    """
    if not GEMINI_API_KEY:
        raise EnvironmentError("GEMINI_API_KEY is not set in environment")

    message = input_data.get("message", "").strip()
    session_id = input_data.get("session_id", f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    if not message:
        raise ValueError("input_data must contain a non-empty 'message' field")

    start = time.time()

    client = genai.Client(api_key=GEMINI_API_KEY)

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=f"{_PROMPT}\n\nUser message: {message}",
    )

    raw = response.text.strip()

    # Strip markdown code fences if Gemini wraps the response
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = json.loads(raw)

    duration_ms = int((time.time() - start) * 1000)

    write_trace({
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": "IntentAgent",
        "step": 1,
        "input": {"message": message},
        "reasoning": (
            f"Detected {result.get('language_detected')}. "
            f"Extracted service_type={result.get('service_type')}, "
            f"location={result.get('location')}, "
            f"time={result.get('time_preference')}."
        ),
        "tools_used": ["gemini_api"],
        "output": result,
        "duration_ms": duration_ms,
    })

    result["time_iso"] = normalize_time(result.get("time_preference"))
    result["session_id"] = session_id
    return result
