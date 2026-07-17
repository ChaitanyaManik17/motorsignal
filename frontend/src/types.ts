export type TaskType = 'tapping' | 'pronation_supination'
export type Point = { x: number; y: number; z: number }
export type Frame = { timestamp_ms: number; landmarks: Point[] }
export type Biomarkers = { rep_count: number; rate_hz: number; amplitude_decay_ratio: number | null; rhythm_cv: number | null }
export type Session = { session_id: string; profile_id: string; timestamp: string; task_type: TaskType; duration_sec: number; data_quality: { frames_total: number; hand_detected_pct: number }; biomarkers: Biomarkers; is_demo_data: boolean }
export type Trend = { biomarker: string; baseline_ready: boolean; baseline_mean?: number; baseline_sd?: number; current_z_score?: number; candidate: boolean; confirmed: boolean; direction?: 'higher'|'lower'; reason: string; points: { session_id: string; timestamp: string; value: number | null; is_demo_data: boolean }[] }
export type Dashboard = { sessions: Session[]; trends: Trend[] }
