from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

TaskType = Literal["tapping", "pronation_supination"]


class Point3D(BaseModel):
    x: float
    y: float
    z: float


class LandmarkFrame(BaseModel):
    timestamp_ms: float = Field(ge=0)
    landmarks: list[Point3D] = Field(min_length=21, max_length=21)


class DataQuality(BaseModel):
    frames_total: int = Field(ge=0)
    hand_detected_pct: float = Field(ge=0, le=1)


class Biomarkers(BaseModel):
    rep_count: int = Field(ge=0)
    rate_hz: float = Field(ge=0)
    amplitude_decay_ratio: float | None = None
    rhythm_cv: float | None = None


class SessionCreate(BaseModel):
    profile_id: str = Field(min_length=1, max_length=120)
    task_type: TaskType
    duration_sec: float = Field(gt=0, le=90)
    frames: list[LandmarkFrame] = Field(default_factory=list)
    frames_total: int = Field(ge=0)
    is_demo_data: bool = False


class SessionRecord(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    profile_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    task_type: TaskType
    duration_sec: float
    data_quality: DataQuality
    biomarkers: Biomarkers
    is_demo_data: bool = False


class TrendPoint(BaseModel):
    session_id: str
    timestamp: datetime
    value: float | None
    is_demo_data: bool = False


class TrendStatus(BaseModel):
    biomarker: str
    baseline_ready: bool
    baseline_mean: float | None = None
    baseline_sd: float | None = None
    current_z_score: float | None = None
    candidate: bool = False
    confirmed: bool = False
    direction: Literal["higher", "lower"] | None = None
    reason: str
    points: list[TrendPoint]


class DashboardResponse(BaseModel):
    sessions: list[SessionRecord]
    trends: list[TrendStatus]
