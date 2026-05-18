"""Generate a realistic providers.json with 25 Islamabad providers.

Schema (locked, owned by Sami, agreed with Abdul Rehman):
  {
    "providers": [
      {
        "id": "P001",
        "name": str,
        "service_categories": [str, ...],
        "area": str,
        "city": "Islamabad",
        "lat": float,
        "lng": float,
        "phone": str,
        "rating": float (1-5),
        "experience_years": int,
        "available": bool,
        "available_slots": [ISO 8601 datetime, ...],
        "price_range": str
      },
      ...
    ]
  }

Areas use real Islamabad sector centroids.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


# Real Islamabad sector centroids (approximate)
AREAS = {
    "F-6":  (33.7294, 73.0931),
    "F-7":  (33.7228, 73.0577),
    "F-8":  (33.7100, 73.0431),
    "F-10": (33.6938, 73.0204),
    "F-11": (33.6831, 72.9989),
    "G-6":  (33.7197, 73.0883),
    "G-7":  (33.7106, 73.0697),
    "G-9":  (33.6925, 73.0339),
    "G-10": (33.6772, 73.0142),
    "G-11": (33.6655, 72.9939),
    "G-13": (33.6447, 72.9519),
    "I-8":  (33.6711, 73.0758),
    "I-9":  (33.6594, 73.0606),
    "I-10": (33.6519, 73.0431),
    "E-11": (33.7022, 72.9931),
    "Bahria Town": (33.5306, 73.0925),
    "DHA Phase 2": (33.5283, 73.1497),
}


def slot_list(base_day_offset: int, hours: list[int]) -> list[str]:
    """Generate ISO 8601 slots for a future day at given hours."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    day = now + timedelta(days=base_day_offset)
    return [
        day.replace(hour=h).isoformat(timespec="seconds")
        for h in hours
    ]


PROVIDERS = [
    # ── AC / HVAC / Refrigeration ─────────────────────────────────────────
    {
        "id": "P001",
        "name": "Cool Breeze AC Services",
        "service_categories": ["AC Technician", "HVAC"],
        "area": "F-7",
        "phone": "+923001234567",
        "rating": 4.7,
        "experience_years": 12,
        "available": True,
        "slots": (0, [9, 11, 14, 17]),
        "price_range": "Rs 1,500 – Rs 5,000",
    },
    {
        "id": "P002",
        "name": "Ali AC Solutions",
        "service_categories": ["AC Technician", "Refrigerator Repair"],
        "area": "G-9",
        "phone": "+923011112233",
        "rating": 4.4,
        "experience_years": 8,
        "available": True,
        "slots": (0, [10, 13, 16]),
        "price_range": "Rs 1,200 – Rs 4,500",
    },
    {
        "id": "P003",
        "name": "Frosty Tech HVAC",
        "service_categories": ["HVAC", "AC Technician"],
        "area": "I-8",
        "phone": "+923215554411",
        "rating": 4.9,
        "experience_years": 15,
        "available": False,
        "slots": (1, [9, 12, 15]),
        "price_range": "Rs 2,000 – Rs 8,000",
    },
    {
        "id": "P004",
        "name": "Bilal Fridge Repair",
        "service_categories": ["Refrigerator Repair"],
        "area": "G-10",
        "phone": "+923338887766",
        "rating": 4.2,
        "experience_years": 6,
        "available": True,
        "slots": (0, [11, 14, 18]),
        "price_range": "Rs 1,000 – Rs 3,500",
    },

    # ── Plumbing ──────────────────────────────────────────────────────────
    {
        "id": "P005",
        "name": "Rashid Plumber Services",
        "service_categories": ["Plumber"],
        "area": "F-10",
        "phone": "+923009998877",
        "rating": 4.6,
        "experience_years": 14,
        "available": True,
        "slots": (0, [8, 10, 13, 16]),
        "price_range": "Rs 800 – Rs 3,000",
    },
    {
        "id": "P006",
        "name": "Quick Fix Plumbing",
        "service_categories": ["Plumber"],
        "area": "G-11",
        "phone": "+923111112233",
        "rating": 4.1,
        "experience_years": 5,
        "available": True,
        "slots": (0, [9, 12, 15, 19]),
        "price_range": "Rs 700 – Rs 2,500",
    },
    {
        "id": "P007",
        "name": "Master Plumber Karim",
        "service_categories": ["Plumber", "Water Tank Cleaning"],
        "area": "I-10",
        "phone": "+923457778899",
        "rating": 4.8,
        "experience_years": 20,
        "available": True,
        "slots": (0, [10, 14, 17]),
        "price_range": "Rs 1,000 – Rs 4,000",
    },

    # ── Electricians ──────────────────────────────────────────────────────
    {
        "id": "P008",
        "name": "Spark Electric Works",
        "service_categories": ["Electrician"],
        "area": "F-8",
        "phone": "+923002223344",
        "rating": 4.5,
        "experience_years": 10,
        "available": True,
        "slots": (0, [9, 11, 14, 17]),
        "price_range": "Rs 800 – Rs 3,500",
    },
    {
        "id": "P009",
        "name": "Yasir Electrician",
        "service_categories": ["Electrician", "Generator Repair"],
        "area": "G-7",
        "phone": "+923331234566",
        "rating": 4.3,
        "experience_years": 9,
        "available": True,
        "slots": (0, [10, 13, 16, 19]),
        "price_range": "Rs 1,000 – Rs 4,000",
    },
    {
        "id": "P010",
        "name": "City Power Electrical",
        "service_categories": ["Electrician"],
        "area": "E-11",
        "phone": "+923216667788",
        "rating": 4.0,
        "experience_years": 4,
        "available": False,
        "slots": (1, [11, 14, 17]),
        "price_range": "Rs 600 – Rs 2,800",
    },

    # ── Barbers ───────────────────────────────────────────────────────────
    {
        "id": "P011",
        "name": "Style Hub Barbers",
        "service_categories": ["Barber"],
        "area": "F-6",
        "phone": "+923004445566",
        "rating": 4.7,
        "experience_years": 8,
        "available": True,
        "slots": (0, [11, 13, 15, 17, 19]),
        "price_range": "Rs 500 – Rs 2,000",
    },
    {
        "id": "P012",
        "name": "Classic Cuts Salon",
        "service_categories": ["Barber"],
        "area": "F-11",
        "phone": "+923009990011",
        "rating": 4.4,
        "experience_years": 11,
        "available": True,
        "slots": (0, [12, 14, 16, 18]),
        "price_range": "Rs 600 – Rs 2,500",
    },

    # ── Pharmacy ──────────────────────────────────────────────────────────
    {
        "id": "P013",
        "name": "Health Plus Pharmacy",
        "service_categories": ["Pharmacy"],
        "area": "G-6",
        "phone": "+923331112200",
        "rating": 4.6,
        "experience_years": 18,
        "available": True,
        "slots": (0, [9, 11, 13, 15, 17, 19, 21]),
        "price_range": "Varies",
    },
    {
        "id": "P014",
        "name": "Care Medical Store",
        "service_categories": ["Pharmacy"],
        "area": "I-9",
        "phone": "+923453334455",
        "rating": 4.3,
        "experience_years": 7,
        "available": True,
        "slots": (0, [10, 12, 14, 16, 18, 20]),
        "price_range": "Varies",
    },

    # ── Carpenter ─────────────────────────────────────────────────────────
    {
        "id": "P015",
        "name": "Wood Master Carpentry",
        "service_categories": ["Carpenter"],
        "area": "G-13",
        "phone": "+923014445500",
        "rating": 4.5,
        "experience_years": 16,
        "available": True,
        "slots": (1, [9, 12, 15]),
        "price_range": "Rs 1,500 – Rs 10,000",
    },
    {
        "id": "P016",
        "name": "Hamid Carpenter Workshop",
        "service_categories": ["Carpenter"],
        "area": "I-10",
        "phone": "+923336667700",
        "rating": 4.2,
        "experience_years": 12,
        "available": True,
        "slots": (0, [10, 14, 17]),
        "price_range": "Rs 1,200 – Rs 8,000",
    },

    # ── Tutor ─────────────────────────────────────────────────────────────
    {
        "id": "P017",
        "name": "Ahmed Math Tutor",
        "service_categories": ["Tutor"],
        "area": "F-7",
        "phone": "+923211234500",
        "rating": 4.9,
        "experience_years": 7,
        "available": True,
        "slots": (0, [16, 17, 18, 19]),
        "price_range": "Rs 1,500 – Rs 4,000 / hr",
    },
    {
        "id": "P018",
        "name": "Sara English Coach",
        "service_categories": ["Tutor"],
        "area": "F-10",
        "phone": "+923009876543",
        "rating": 4.7,
        "experience_years": 5,
        "available": True,
        "slots": (0, [15, 17, 19]),
        "price_range": "Rs 1,200 – Rs 3,500 / hr",
    },

    # ── Generator Repair ──────────────────────────────────────────────────
    {
        "id": "P019",
        "name": "PowerGen Solutions",
        "service_categories": ["Generator Repair", "Electrician"],
        "area": "I-9",
        "phone": "+923331110099",
        "rating": 4.6,
        "experience_years": 13,
        "available": True,
        "slots": (0, [9, 13, 16]),
        "price_range": "Rs 2,000 – Rs 15,000",
    },

    # ── Pest Control ──────────────────────────────────────────────────────
    {
        "id": "P020",
        "name": "BugBusters Pest Control",
        "service_categories": ["Pest Control"],
        "area": "Bahria Town",
        "phone": "+923009998800",
        "rating": 4.4,
        "experience_years": 9,
        "available": True,
        "slots": (1, [10, 13, 16]),
        "price_range": "Rs 3,000 – Rs 12,000",
    },
    {
        "id": "P021",
        "name": "GreenShield Pest Services",
        "service_categories": ["Pest Control"],
        "area": "DHA Phase 2",
        "phone": "+923214567890",
        "rating": 4.5,
        "experience_years": 11,
        "available": True,
        "slots": (0, [11, 14, 17]),
        "price_range": "Rs 2,500 – Rs 10,000",
    },

    # ── Water Tank Cleaning ───────────────────────────────────────────────
    {
        "id": "P022",
        "name": "AquaClean Services",
        "service_categories": ["Water Tank Cleaning", "Plumber"],
        "area": "G-10",
        "phone": "+923331239876",
        "rating": 4.3,
        "experience_years": 6,
        "available": True,
        "slots": (0, [9, 12, 15]),
        "price_range": "Rs 2,500 – Rs 6,000",
    },

    # ── Car Mechanic ──────────────────────────────────────────────────────
    {
        "id": "P023",
        "name": "Auto Care Workshop",
        "service_categories": ["Car Mechanic"],
        "area": "I-10",
        "phone": "+923001110022",
        "rating": 4.6,
        "experience_years": 17,
        "available": True,
        "slots": (0, [9, 11, 14, 16]),
        "price_range": "Rs 1,500 – Rs 20,000",
    },
    {
        "id": "P024",
        "name": "Speedy Motors Garage",
        "service_categories": ["Car Mechanic"],
        "area": "G-9",
        "phone": "+923459876123",
        "rating": 4.1,
        "experience_years": 8,
        "available": False,
        "slots": (1, [10, 13, 16]),
        "price_range": "Rs 1,200 – Rs 15,000",
    },
    {
        "id": "P025",
        "name": "Khan Auto Repair",
        "service_categories": ["Car Mechanic"],
        "area": "E-11",
        "phone": "+923214449988",
        "rating": 4.4,
        "experience_years": 14,
        "available": True,
        "slots": (0, [10, 13, 17]),
        "price_range": "Rs 1,000 – Rs 18,000",
    },
]


def build() -> dict:
    out = []
    for p in PROVIDERS:
        area = p["area"]
        lat, lng = AREAS[area]
        day_offset, hours = p["slots"]
        record = {
            "id": p["id"],
            "name": p["name"],
            "service_categories": p["service_categories"],
            "area": area,
            "city": "Islamabad",
            "lat": lat,
            "lng": lng,
            "phone": p["phone"],
            "rating": p["rating"],
            "experience_years": p["experience_years"],
            "available": p["available"],
            "available_slots": slot_list(day_offset, hours),
            "price_range": p["price_range"],
        }
        out.append(record)
    return {"providers": out}


if __name__ == "__main__":
    data = build()
    path = Path(__file__).resolve().parent.parent / "data" / "providers.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(data['providers'])} providers to {path}")
