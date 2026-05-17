"""
Agent 3 — Recommendation Agent
──────────────────────────────────────────────────────────────
Responsibility:
  Rank providers by composite score and return best match.

  Ranking formula:
    score = (0.40 * proximity_score)
          + (0.40 * rating_score)
          + (0.20 * availability_score)

  proximity_score    = 1 - (distance_km / max_distance_km)
  rating_score       = (rating - 1) / 4
  availability_score = 1 if available else 0

Author: [Team Member — assign here]
Status: TODO — implement this agent
"""


def compute_score(provider: dict, max_distance: float) -> float:
    """Compute composite ranking score for a single provider."""
    # TODO: implement scoring formula
    raise NotImplementedError("Scoring not yet implemented")


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: { "providers": [ {...}, {...} ] }

    Returns:
        {
          "best_provider": { ...provider fields... },
          "score": 0.91,
          "all_ranked": [ {...}, {...} ],
          "reasoning_text": "Ali AC Services selected because..."
        }
    """
    # TODO: score all providers, sort, return best with reasoning
    raise NotImplementedError("Recommendation Agent not yet implemented")
