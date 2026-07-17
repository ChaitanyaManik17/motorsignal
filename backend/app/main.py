from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from .models import DashboardResponse, DataQuality, SessionCreate, SessionRecord
from .demo_data import synthetic_sessions
from .signal_processing import analyze_frames, trend_for_metric
from .storage import store

app = FastAPI(title="MotorSignal API", version="0.1.0")
origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

METRICS = ["rate_hz", "amplitude_decay_ratio", "rhythm_cv"]


@app.get("/health")
def health() -> dict:
    return {"ok": True, "storage": "memory" if store.memory is not None else "mongo"}


@app.post("/api/sessions", response_model=SessionRecord)
def create_session(payload: SessionCreate) -> dict:
    detected = len(payload.frames)
    quality = DataQuality(frames_total=payload.frames_total, hand_detected_pct=round(detected / payload.frames_total, 3) if payload.frames_total else 0)
    biomarkers = analyze_frames(payload.frames, payload.task_type, payload.duration_sec)
    session = SessionRecord(
        profile_id=payload.profile_id, task_type=payload.task_type, duration_sec=payload.duration_sec,
        data_quality=quality, biomarkers=biomarkers, is_demo_data=payload.is_demo_data,
    ).model_dump()
    store.insert(session)
    return session


@app.get("/api/dashboard/{profile_id}", response_model=DashboardResponse)
def dashboard(profile_id: str, task_type: str = "tapping") -> dict:
    if task_type not in ("tapping", "pronation_supination"):
        raise HTTPException(400, "Unknown task type")
    sessions = store.list(profile_id, task_type)
    return {"sessions": sessions, "trends": [trend_for_metric(sessions, metric) for metric in METRICS]}


@app.post("/api/demo/seed/{profile_id}")
def seed_demo(profile_id: str) -> dict:
    """Load labeled synthetic history into the configured storage for a live demo."""
    store.clear_demo(profile_id)
    for session in synthetic_sessions(profile_id):
        store.insert(session)
    return {"inserted": 12, "label": "synthetic demo data"}


@app.get("/api/export/{profile_id}", response_class=HTMLResponse)
def clinician_export(profile_id: str, task_type: str = "tapping") -> str:
    sessions = store.list(profile_id, task_type)
    trends = [trend_for_metric(sessions, metric) for metric in METRICS]
    rows = "".join(f"<tr><td>{s['timestamp'].strftime('%b %d, %Y')}</td><td>{s['biomarkers']['rep_count']}</td><td>{s['biomarkers']['rate_hz']:.2f} Hz</td><td>{s['biomarkers']['amplitude_decay_ratio'] or '—'}</td><td>{s['biomarkers']['rhythm_cv'] or '—'}</td></tr>" for s in sessions[-8:])
    trend_text = "".join(f"<li><strong>{t['biomarker'].replace('_', ' ').title()}</strong>: {t['reason']}</li>" for t in trends)
    return f'''<!doctype html><html><head><title>MotorSignal session summary</title><style>body{{font-family:Arial;max-width:760px;margin:48px auto;color:#19211e}}h1{{margin-bottom:4px}}.note{{padding:14px;background:#fff4dc;border-radius:8px}}table{{width:100%;border-collapse:collapse;margin-top:24px}}td,th{{text-align:left;padding:10px;border-bottom:1px solid #ddd}}small{{color:#667}}</style></head><body><h1>MotorSignal summary</h1><p>Task: {task_type.replace('_',' ')} · Profile: {profile_id}</p><p class="note"><strong>Not a diagnosis.</strong> This browser-based motor-task summary should only be interpreted with clinical context. {'This report includes synthetic demo data.' if any(s.get('is_demo_data') for s in sessions) else ''}</p><h2>Trend validation</h2><ul>{trend_text}</ul><h2>Recent sessions</h2><table><thead><tr><th>Date</th><th>Reps</th><th>Rate</th><th>Amplitude decay</th><th>Rhythm CV</th></tr></thead><tbody>{rows or '<tr><td colspan="5">No sessions yet.</td></tr>'}</tbody></table><p><small>Raw video was not collected. Derived from browser-side MediaPipe world-landmark coordinates.</small></p></body></html>'''
