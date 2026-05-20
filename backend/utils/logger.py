import json
from datetime import datetime, timezone
from pathlib import Path

LOGS_DIR = Path(__file__).parent.parent.parent / "logs"


def write_trace(session_id: str, agent: str, step: str, **kwargs) -> None:
    """Append one trace entry. kwargs become fields on the entry."""
    LOGS_DIR.mkdir(exist_ok=True)
    log_file = LOGS_DIR / f"agent_trace_{session_id}.json"

    entry = {
        "agent": agent,
        "step": step,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **kwargs,
    }

    traces = []
    if log_file.exists():
        with open(log_file, encoding="utf-8") as f:
            try:
                traces = json.load(f)
            except json.JSONDecodeError:
                traces = []
    traces.append(entry)

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(traces, f, indent=2, ensure_ascii=False)