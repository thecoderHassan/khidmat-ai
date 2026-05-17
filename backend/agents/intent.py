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
MOCK_INTENT = os.getenv("MOCK_INTENT", "false").lower() == "true"

# Simple keyword-based mock parser — used when MOCK_INTENT=true
_MOCK_CATEGORY_MAP = {
    "ac": "AC Technician", "technician": "AC Technician", "hvac": "AC Technician",
    "plumber": "Plumber", "pipe": "Plumber",
    "electrician": "Electrician", "bijli": "Electrician", "electric": "Electrician",
    "tutor": "Tutor", "teacher": "Tutor", "padhai": "Tutor",
    "beautician": "Beautician", "beauty": "Beautician", "parlour": "Beautician",
    "carpenter": "Carpenter", "furniture": "Carpenter",
    "painter": "Painter", "paint": "Painter",
    "driver": "Driver", "airport": "Driver", "cab": "Driver",
    "maid": "Maid", "cleaning": "Maid", "safai": "Maid",
    "delivery": "Delivery Worker", "parcel": "Delivery Worker",
}

_MOCK_AREA_MAP = [
    "G-6","G-7","G-8","G-9","G-10","G-11","G-12","G-13","G-14",
    "F-6","F-7","F-8","F-9","F-10","F-11",
    "E-7","E-8","E-11","I-8","I-9","I-10","I-11",
    "Blue Area",
]

_MOCK_TIME_KEYWORDS = {
    "kal": "Tomorrow morning", "tomorrow": "Tomorrow morning",
    "aaj": "Today", "today": "Today",
    "subah": "Tomorrow morning", "morning": "Tomorrow morning",
    "sham": "Today evening", "evening": "Today evening",
    "asap": "ASAP", "abhi": "ASAP",
}


def _mock_parse(message: str) -> dict:
    tokens = message.lower().split()

    service_type = None
    for token in tokens:
        clean = token.strip(".,!?")
        if clean in _MOCK_CATEGORY_MAP:
            service_type = _MOCK_CATEGORY_MAP[clean]
            break

    location = None
    msg_upper = message.upper()
    for area in _MOCK_AREA_MAP:
        if area.upper() in msg_upper or area.replace("-", "").upper() in msg_upper.replace("-", "").replace(" ", ""):
            location = area
            break

    # Collect all matching time tokens and combine (e.g. "today" + "evening" → "Today evening")
    day_part = None
    tod_part = None
    for token in tokens:
        clean = token.strip(".,!?")
        if clean in ("kal", "tomorrow", "parson"):
            day_part = "Tomorrow"
        elif clean in ("aaj", "today"):
            day_part = "Today"
        if clean in ("subah", "morning"):
            tod_part = "morning"
        elif clean in ("sham", "evening"):
            tod_part = "evening"
        elif clean in ("asap", "abhi", "now"):
            day_part, tod_part = "ASAP", None

    if day_part == "ASAP":
        time_preference = "ASAP"
    elif day_part and tod_part:
        time_preference = f"{day_part} {tod_part}"
    elif day_part:
        time_preference = f"{day_part} morning"
    else:
        time_preference = "Tomorrow morning"

    urdu_chars = any('؀' <= c <= 'ۿ' for c in message)
    roman_urdu_words = {"mujhe", "chahiye", "kal", "subah", "mein", "aaj", "sham", "abhi"}
    has_roman = any(w in tokens for w in roman_urdu_words)
    if urdu_chars:
        language = "Urdu"
    elif has_roman:
        language = "Roman Urdu"
    else:
        language = "English"

    return {
        "service_type": service_type,
        "location": location,
        "time_preference": time_preference,
        "language_detected": language,
    }

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
    message = input_data.get("message", "").strip()
    session_id = input_data.get("session_id", f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    if not message:
        raise ValueError("input_data must contain a non-empty 'message' field")

    start = time.time()

    if MOCK_INTENT:
        result = _mock_parse(message)
        tools_used = ["mock_keyword_parser"]
    else:
        if not GEMINI_API_KEY:
            raise EnvironmentError("GEMINI_API_KEY is not set in environment")

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{_PROMPT}\n\nUser message: {message}",
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        result = json.loads(raw)
        tools_used = ["gemini_api"]

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
        "tools_used": tools_used,
        "output": result,
        "duration_ms": duration_ms,
    })

    result["time_iso"] = normalize_time(result.get("time_preference"))
    result["session_id"] = session_id
    return result
