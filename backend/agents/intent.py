"""
Agent 1 — Intent Agent
──────────────────────────────────────────────────────────────
Responsibility:
  Parse natural language input using Gemini API.
  Extract: service_type, location, time, detected_language.

Author: [Team Member — assign here]
Status: TODO — implement this agent
"""

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: { "message": "Mujhe kal subah G-13 mein AC technician chahiye" }

    Returns:
        {
          "service_type": "AC Technician",
          "location": "G-13",
          "time": "tomorrow morning",
          "language": "roman_urdu"
        }
    """
    # TODO: Call Gemini API with the message and extract structured intent
    raise NotImplementedError("Intent Agent not yet implemented")
