import type { Dashboard, Frame, Session, TaskType } from './types'
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const api = {
  dashboard: (profile: string, task: TaskType) => fetch(`${API}/api/dashboard/${encodeURIComponent(profile)}?task_type=${task}`).then(r => r.json() as Promise<Dashboard>),
  save: (payload: { profile_id: string; task_type: TaskType; duration_sec: number; frames: Frame[]; frames_total: number }) => fetch(`${API}/api/sessions`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }).then(r => { if (!r.ok) throw new Error('Could not save session'); return r.json() as Promise<Session> }),
  seedDemo: (profile: string) => fetch(`${API}/api/demo/seed/${encodeURIComponent(profile)}`, { method: 'POST' }).then(r => { if (!r.ok) throw new Error('Could not load demo data'); return r.json() }),
  exportUrl: (profile: string, task: TaskType) => `${API}/api/export/${encodeURIComponent(profile)}?task_type=${task}`,
}
