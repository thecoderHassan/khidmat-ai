from datetime import datetime, timedelta

# Time-of-day keyword → hour
_TOD_MAP = {
    "morning":   9,
    "subah":     9,   # Urdu: morning
    "afternoon": 14,
    "dopahar":   14,  # Urdu: afternoon
    "evening":   18,
    "sham":      18,  # Urdu: evening
    "night":     20,
    "raat":      20,  # Urdu: night
    "asap":      None,
    "now":       None,
    "abhi":      None,  # Urdu: right now
}

# Day keyword → day offset from today
_DAY_MAP = {
    "today":    0,
    "aaj":      0,   # Urdu: today
    "tomorrow": 1,
    "kal":      1,   # Urdu: tomorrow (also means yesterday, context decides)
    "parson":   2,   # Urdu: day after tomorrow
}


def normalize_time(time_preference: str | None, reference: datetime | None = None) -> str:
    """
    Convert a natural language time string to "YYYY-MM-DD HH:MM" format.

    Examples:
        "Tomorrow morning"   → "2026-05-18 09:00"
        "Today evening"      → "2026-05-17 18:00"
        "ASAP"               → "2026-05-17 10:00"  (next rounded hour)
        "Kal subah"          → "2026-05-18 09:00"
    """
    now = reference or datetime.now()

    if not time_preference:
        # Default: tomorrow morning
        target = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        return target.strftime("%Y-%m-%dT%H:%M:%S")

    tokens = time_preference.lower().split()

    # Resolve day offset
    day_offset = 1  # default: tomorrow
    for token in tokens:
        if token in _DAY_MAP:
            day_offset = _DAY_MAP[token]
            break

    # Resolve hour
    hour = 9  # default: morning
    is_asap = False
    for token in tokens:
        if token in _TOD_MAP:
            val = _TOD_MAP[token]
            if val is None:
                is_asap = True
            else:
                hour = val
            break

    if is_asap:
        # Round up to next full hour
        target = now + timedelta(hours=1)
        target = target.replace(minute=0, second=0, microsecond=0)
        return target.strftime("%Y-%m-%dT%H:%M:%S")

    target = (now + timedelta(days=day_offset)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )
    return target.strftime("%Y-%m-%dT%H:%M:%S")
