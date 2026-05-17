"""
Ranking logic for Agent 2 (Discovery).

The Discovery Agent uses this as a deterministic scoring tool — it decides
*what* matters (filtering, weights, slot-matching) and produces explainable
reasoning, while the arithmetic here stays predictable and testable.

Scores each provider 0-100 on proximity, rating, and availability so the
agent can return a single `top_match` plus ranked `alternatives`.

Formula (from README):
    score = (0.40 x proximity_score)
          + (0.40 x rating_score)
          + (0.20 x availability_score)

    proximity_score    = 1 - (distance_km / max_distance_km)
    rating_score       = (rating - 1) / 4          # maps 1-5 stars -> 0-1
    availability_score = 1 if available else 0
"""

# Weights — must sum to 1.0
W_PROXIMITY = 0.40
W_RATING = 0.40
W_AVAILABILITY = 0.20


def calculate_score(distance: float, rating: float, available: bool,
                    max_distance: float = 0.0) -> int:
    """
    Return an integer 0-100 match score for a single provider.

    Args:
        distance:     distance_km from the user to this provider.
        rating:       provider rating on a 1-5 scale.
        available:    whether the provider is currently available.
        max_distance: largest distance_km in the candidate set, used to
                      normalise proximity. When 0 (single result, or all
                      providers equidistant) proximity is treated as best.
    """
    if max_distance and max_distance > 0:
        proximity_score = 1 - (distance / max_distance)
    else:
        proximity_score = 1.0
    proximity_score = max(0.0, min(1.0, proximity_score))

    rating_score = max(0.0, min(1.0, (rating - 1) / 4))
    availability_score = 1.0 if available else 0.0

    score = (W_PROXIMITY * proximity_score
             + W_RATING * rating_score
             + W_AVAILABILITY * availability_score)
    return round(score * 100)


def rank_providers(providers: list[dict]) -> list[dict]:
    """
    Attach an integer `score` (0-100) to each provider and return the list
    sorted best-first. Each provider must already carry `distance_km`,
    `rating`, and `available`.

    Ties on score are broken by the smaller distance.
    """
    if not providers:
        return []

    # With a single candidate there is no spread to normalise proximity
    # against — scoring the only option against itself yields proximity 0.
    # Passing max_distance=0 routes calculate_score to its best-proximity
    # branch so "the only available driver" isn't penalised to ~57.
    if len(providers) > 1:
        max_distance = max(p.get("distance_km", 0.0) for p in providers)
    else:
        max_distance = 0.0

    for p in providers:
        p["score"] = calculate_score(
            distance=p.get("distance_km", 0.0),
            rating=p.get("rating", 0.0),
            available=p.get("available", False),
            max_distance=max_distance,
        )

    return sorted(providers, key=lambda p: (-p["score"], p.get("distance_km", 0.0)))
