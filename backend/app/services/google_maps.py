"""Google Maps Distance Matrix wrapper with haversine fallback."""
import logging
import math
import os
from typing import Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

_MAPS_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def get_distance_km(
    user_lat: float, user_lng: float, prov_lat: float, prov_lng: float
) -> Tuple[float, Optional[int], str]:
    """Return (distance_km, eta_seconds_or_None, tool_name).

    Tries Google Maps Distance Matrix first. Falls back to haversine on
    any failure (missing key, network, quota, 4xx/5xx).
    """
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        return (
            round(_haversine_km(user_lat, user_lng, prov_lat, prov_lng), 2),
            None,
            "haversine_distance",
        )

    try:
        with httpx.Client(timeout=2.5) as c:
            r = c.get(
                _MAPS_URL,
                params={
                    "origins": f"{user_lat},{user_lng}",
                    "destinations": f"{prov_lat},{prov_lng}",
                    "mode": "driving",
                    "key": key,
                },
            )
        r.raise_for_status()
        data = r.json()
        elem = data["rows"][0]["elements"][0]
        if elem.get("status") != "OK":
            raise ValueError(f"Maps element status: {elem.get('status')}")
        dist_km = elem["distance"]["value"] / 1000.0
        eta_sec = elem["duration"]["value"]
        return round(dist_km, 2), int(eta_sec), "google_maps_distance_matrix"
    except Exception as e:
        logger.warning("Maps API failed, falling back to haversine: %s", e)
        return (
            round(_haversine_km(user_lat, user_lng, prov_lat, prov_lng), 2),
            None,
            "haversine_distance",
        )