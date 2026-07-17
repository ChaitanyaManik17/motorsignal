"""Landmark-only task signal processing.

No image/video data enters this module. Distances use MediaPipe world landmarks,
which are approximately metric coordinates and less camera-distance sensitive.
"""
from __future__ import annotations

from math import sqrt
from statistics import mean, stdev

import numpy as np
from scipy.signal import find_peaks

from .models import Biomarkers, LandmarkFrame, TaskType

LANDMARK_PAIR: dict[TaskType, tuple[int, int]] = {
    "tapping": (4, 8),
    "pronation_supination": (5, 17),
}


def distance(frame: LandmarkFrame, task_type: TaskType) -> float:
    a_idx, b_idx = LANDMARK_PAIR[task_type]
    a, b = frame.landmarks[a_idx], frame.landmarks[b_idx]
    return sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)


def analyze_frames(frames: list[LandmarkFrame], task_type: TaskType, duration_sec: float) -> Biomarkers:
    """Detect cycles using peaks in the landmark-distance signal.

    Tapping peaks represent the fingers being apart; pronation peaks represent a
    broad palm facing the camera. Adjacent troughs provide per-cycle amplitude.
    """
    if len(frames) < 8 or duration_sec <= 0:
        return Biomarkers(rep_count=0, rate_hz=0, amplitude_decay_ratio=None, rhythm_cv=None)

    timestamps = np.array([frame.timestamp_ms for frame in frames], dtype=float) / 1000
    raw = np.array([distance(frame, task_type) for frame in frames], dtype=float)
    # A short moving average removes webcam jitter without hiding normal cadence.
    window = min(7, len(raw) if len(raw) % 2 else len(raw) - 1)
    if window >= 3:
        raw = np.convolve(raw, np.ones(window) / window, mode="same")
    sample_interval = float(np.median(np.diff(timestamps))) if len(timestamps) > 1 else 1 / 30
    min_peak_gap = max(1, round(0.20 / max(sample_interval, 0.001)))
    prominence = max(float(np.std(raw)) * 0.35, 0.002)
    peaks, _ = find_peaks(raw, distance=min_peak_gap, prominence=prominence)
    troughs, _ = find_peaks(-raw, distance=min_peak_gap, prominence=prominence * 0.45)

    amplitudes: list[float] = []
    for peak in peaks:
        nearby = troughs[(troughs < peak) & (troughs >= peak - min_peak_gap * 3)]
        if len(nearby):
            amplitudes.append(float(raw[peak] - raw[nearby[-1]]))

    rep_count = int(len(peaks))
    rate = rep_count / duration_sec
    decay = None
    if len(amplitudes) >= 4:
        midpoint = len(amplitudes) // 2
        first, second = mean(amplitudes[:midpoint]), mean(amplitudes[midpoint:])
        if first > 0:
            decay = round(second / first, 3)
    rhythm_cv = None
    if len(peaks) >= 3:
        intervals = np.diff(timestamps[peaks])
        interval_mean = float(np.mean(intervals))
        if interval_mean > 0:
            rhythm_cv = round(float(np.std(intervals, ddof=1)) / interval_mean, 3)
    return Biomarkers(rep_count=rep_count, rate_hz=round(rate, 3), amplitude_decay_ratio=decay, rhythm_cv=rhythm_cv)


def valid_for_trend(session: dict) -> bool:
    return (
        session["data_quality"]["hand_detected_pct"] > 0.8
        and session["duration_sec"] >= 12
    )


def trend_for_metric(sessions: list[dict], metric: str) -> dict:
    """Require a stable 3-session baseline and two same-direction outliers."""
    valid = [s for s in sessions if valid_for_trend(s) and s["biomarkers"].get(metric) is not None]
    points = [
        {"session_id": s["session_id"], "timestamp": s["timestamp"], "value": s["biomarkers"].get(metric), "is_demo_data": s.get("is_demo_data", False)}
        for s in valid
    ]
    if len(valid) < 3:
        return {"biomarker": metric, "baseline_ready": False, "reason": "Complete 3 valid sessions to establish a personal baseline.", "points": points}
    baseline_values = [s["biomarkers"][metric] for s in valid[:3]]
    base_mean = mean(baseline_values)
    base_sd = stdev(baseline_values) if len(baseline_values) > 1 else 0
    if base_sd < max(abs(base_mean) * 0.03, 0.01):
        return {"biomarker": metric, "baseline_ready": True, "baseline_mean": base_mean, "baseline_sd": base_sd, "reason": "Baseline variation is too small for reliable z-score alerts.", "points": points}
    if len(valid) == 3:
        return {"biomarker": metric, "baseline_ready": True, "baseline_mean": round(base_mean, 3), "baseline_sd": round(base_sd, 3), "reason": "Personal baseline established; future sessions will be checked against it.", "points": points}
    current = valid[-1]["biomarkers"][metric]
    current_z = (current - base_mean) / base_sd
    candidate = abs(current_z) > 1.5
    direction = "higher" if current_z > 0 else "lower"
    confirmed = False
    if candidate and len(valid) >= 5:
        previous_z = (valid[-2]["biomarkers"][metric] - base_mean) / base_sd
        confirmed = abs(previous_z) > 1.5 and (previous_z > 0) == (current_z > 0)
    reason = "No consistent change detected."
    if candidate and not confirmed:
        reason = "A possible change needs one more same-direction session before it is surfaced."
    if confirmed:
        reason = "Consistent same-direction change across two sessions; discuss alongside clinical context."
    return {
        "biomarker": metric, "baseline_ready": True, "baseline_mean": round(base_mean, 3), "baseline_sd": round(base_sd, 3),
        "current_z_score": round(current_z, 2), "candidate": candidate, "confirmed": confirmed,
        "direction": direction if candidate else None, "reason": reason, "points": points,
    }
