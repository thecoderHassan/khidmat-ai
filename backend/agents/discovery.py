"""
Agent 2 — Discovery Agent
──────────────────────────────────────────────────────────────
Responsibility:
  Query Google Maps API + filter providers.json.
  Return nearby providers matching the requested service category.

Author: [Team Member — assign here]
Status: TODO — implement this agent
"""

import os
import json
from dotenv import load_dotenv

load_dotenv()

MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
PROVIDERS_FILE = os.path.join(os.path.dirname(__file__), "../data/providers.json")


def load_providers():
    with open(PROVIDERS_FILE, "r") as f:
        return json.load(f)


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: {
          "service_type": "AC Technician",
          "location": "G-13",
          "time": "tomorrow morning"
        }

    Returns:
        {
          "providers": [
            { "provider_id": "PRV-001", "name": "...", "distance_km": 2.1,
              "rating": 4.8, "available": true, "available_slots": [...] }
          ]
        }
    """
    # TODO: Filter providers.json by service_type, then use Maps API for distance
    raise NotImplementedError("Discovery Agent not yet implemented")
