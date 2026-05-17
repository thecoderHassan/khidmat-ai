"""
Agent 3 — Confirmation Agent
Validates the provider the user selected and generates reasoning text.
Triggered by POST /book after user taps a provider in the app.
"""


def run(input_data: dict) -> dict:
    """
    Entry point called by the pipeline.

    Args:
        input_data: {
            "provider_id": "PRV-001",
            "slot": "09:00",
            "service_type": "AC Technician",
            "session_id": "SES-001"
        }

    Returns:
        {
            "provider": { ...full provider object... },
            "confirmed_slot": "09:00",
            "reasoning_text": "Ali AC Services selected — closest (0.0km), rating 4.8, available at 09:00.",
            "session_id": "SES-001"
        }
    """
    # TODO: implement — load provider by ID, validate slot, generate reasoning
    raise NotImplementedError("Confirmation Agent not yet implemented")
