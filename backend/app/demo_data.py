from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4


def synthetic_sessions(profile_id: str) -> list[dict]:
    """A clearly labeled three-week demo trend; never presented as measurements."""
    today = datetime.now(timezone.utc)
    decay = [1.02, 0.97, 1.05, 0.90, 0.84, 0.81, 0.79, 0.77, 0.75, 0.74, 0.72, 0.70]
    return [{
        "session_id": str(uuid4()), "profile_id": profile_id,
        "timestamp": today - timedelta(days=(11-index) * 2), "task_type": "tapping", "duration_sec": 15,
        "data_quality": {"frames_total": 450, "hand_detected_pct": 0.96},
        "biomarkers": {"rep_count": 58-index//3, "rate_hz": round((58-index//3)/15, 2), "amplitude_decay_ratio": value, "rhythm_cv": round(.11 + index*.008, 3)},
        "is_demo_data": True,
    } for index, value in enumerate(decay)]
