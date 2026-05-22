import json
from datetime import datetime, timezone
from pathlib import Path

LOGS_DIR = Path(__file__).parent.parent / "logs"


def write_trace(*args, **kwargs) -> None:
    """Append one trace entry. Accepts BOTH calling styles:
    - write_trace(session_id, agent, step, **kwargs)
    - write_trace({"session_id": ..., "agent": ..., "step": ..., ...})
    """
    if len(args) == 1 and isinstance(args[0], dict):
        d = args[0]
        session_id = d.get("session_id", "unknown")
        agent = d.get("agent", "unknown")
        step = d.get("step", "step")
        extra = {k: v for k, v in d.items() if k not in {"session_id", "agent", "step"}}
        kwargs = {**extra, **kwargs}
    else:
        session_id = args[0] if len(args) > 0 else kwargs.pop("session_id", "unknown")
        agent = args[1] if len(args) > 1 else kwargs.pop("agent", "unknown")
        step = args[2] if len(args) > 2 else kwargs.pop("step", "step")

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