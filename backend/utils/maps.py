import math

# Approximate center coordinates for Islamabad/Rawalpindi areas
AREA_COORDS = {
    "G-6":       (33.7290, 73.0935),
    "G-7":       (33.7220, 73.0820),
    "G-8":       (33.7150, 73.0700),
    "G-9":       (33.6995, 73.0440),
    "G-10":      (33.7020, 73.0397),
    "G-11":      (33.6938, 73.0551),
    "G-12":      (33.6890, 73.0510),
    "G-13":      (33.6844, 73.0479),
    "G-14":      (33.6800, 73.0450),
    "F-6":       (33.7280, 73.0750),
    "F-7":       (33.7192, 73.0587),
    "F-8":       (33.7100, 73.0480),
    "F-9":       (33.7050, 73.0380),
    "F-10":      (33.7077, 73.0354),
    "F-11":      (33.7000, 73.0290),
    "E-7":       (33.7350, 73.0650),
    "E-8":       (33.7280, 73.0550),
    "E-11":      (33.7215, 73.0194),
    "I-8":       (33.6741, 73.0632),
    "I-9":       (33.6650, 73.0700),
    "I-10":      (33.6600, 73.0580),
    "I-11":      (33.6550, 73.0480),
    "Blue Area": (33.7258, 73.0898),
    "Rawalpindi": (33.5651, 73.0169),
    "Saddar":    (33.5983, 73.0565),
}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return round(R * 2 * math.asin(math.sqrt(a)), 2)


def get_area_coords(area: str) -> tuple[float, float] | None:
    """Return (lat, lng) for an area name, case-insensitive partial match."""
    area_upper = area.upper().strip()
    for key, coords in AREA_COORDS.items():
        if key.upper() == area_upper:
            return coords
    # fallback: partial match (e.g. "g13" → "G-13")
    normalized = area_upper.replace("-", "").replace(" ", "")
    for key, coords in AREA_COORDS.items():
        if key.upper().replace("-", "").replace(" ", "") == normalized:
            return coords
    return None
