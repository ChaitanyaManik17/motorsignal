import { useEffect, useState } from 'react'

import { api } from './api'
import type { Dashboard, TaskType, Trend } from './types'
import { useHandTask } from './useHandTask'

const PROFILE_KEY = 'motorsignal-profile'
const TASK_DURATION_SECONDS = 15

const taskCopy: Record<TaskType, { title: string; short: string; instruction: string; icon: string }> = {
  tapping: {
    title: 'Finger tapping', short: 'Thumb ↔ index', icon: '✦',
    instruction: 'Hold your hand in view and repeatedly tap your thumb to your index finger at a comfortable, consistent pace.',
  },
  pronation_supination: {
    title: 'Hand rotation', short: 'Palm width proxy', icon: '◒',
    instruction: 'Hold your hand up and rotate your palm smoothly back and forth, keeping your wrist in frame.',
  },
}

const metricLabels: Record<string, string> = {
  rate_hz: 'Movement rate',
  amplitude_decay_ratio: 'Movement amplitude',
  rhythm_cv: 'Rhythm consistency',
}

function profileId() {
  let id = localStorage.getItem(PROFILE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PROFILE_KEY, id)
  }
  return id
}

function formatMetric(metric: string, value: number | null | undefined) {
  if (value == null) return '—'
  if (metric === 'rate_hz') return `${value.toFixed(2)} Hz`
  if (metric === 'rhythm_cv') return value.toFixed(3)
  return `${(value * 100).toFixed(0)}%`
}

function amplitudeInsight(value: number | null | undefined) {
  if (value == null) return 'Collect a little more movement data'
  if (value === 1) return 'Same amplitude in both halves'
  const percent = Math.abs(Math.round((value - 1) * 100))
  return value > 1 ? `${percent}% larger in the later half` : `${percent}% lower in the later half`
}

function statusForTrend(trend: Trend) {
  if (trend.confirmed) return { label: 'Confirmed pattern', tone: 'alert' }
  if (trend.candidate) return { label: 'Watching pattern', tone: 'watching' }
  if (trend.baseline_ready) return { label: 'Baseline ready', tone: 'ready' }
  return { label: 'Baseline building', tone: 'building' }
}

function TrendCard({ trend }: { trend: Trend }) {
  const status = statusForTrend(trend)
  return (
    <article className={`trend-card ${status.tone}`}>
      <div className="trend-head">
        <span>{metricLabels[trend.biomarker] || trend.biomarker.replaceAll('_', ' ')}</span>
        <i className={`status-dot ${status.tone}`} />
      </div>
      <strong>{status.label}</strong>
      <p>{trend.reason}</p>
      {trend.current_z_score != null && (
        <small>Latest deviation <b>{trend.current_z_score > 0 ? '+' : ''}{trend.current_z_score}σ</b> from baseline</small>
      )}
    </article>
  )
}

function BaselineProgress({ completed }: { completed: number }) {
  const count = Math.min(completed, 3)
  return (
    <div className="baseline-progress" aria-label={`${count} of 3 baseline sessions complete`}>
      <div className="progress-circles">{[1, 2, 3].map(step => <span key={step} className={step <= count ? 'complete' : ''}>{step <= count ? '✓' : step}</span>)}</div>
      <div><b>{count} of 3 baseline sessions</b><small>Complete three high-quality check-ins to unlock your personal reference range.</small></div>
    </div>
  )
}

function MiniChart({ trend, sessions }: { trend: Trend; sessions: number }) {
  const values = trend.points.map(point => point.value).filter((value): value is number => value != null)
  if (values.length < 2) return <BaselineProgress completed={sessions} />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const coordinates = values.map((value, index) => `${(index / (values.length - 1)) * 100},${86 - ((value - min) / spread) * 66}`).join(' ')
  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Movement amplitude history">
        <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f27b63" stopOpacity=".20" /><stop offset="1" stopColor="#f27b63" stopOpacity="0" /></linearGradient></defs>
        <line x1="0" y1="20" x2="100" y2="20" /><line x1="0" y1="53" x2="100" y2="53" /><line x1="0" y1="86" x2="100" y2="86" />
        <polygon points={`0,86 ${coordinates} 100,86`} fill="url(#chart-fill)" />
        <polyline points={coordinates} />
        {values.map((value, index) => <circle key={index} cx={(index / (values.length - 1)) * 100} cy={86 - ((value - min) / spread) * 66} r="1.8" />)}
      </svg>
      <div className="chart-foot"><span>Earlier</span><span>Latest</span></div>
    </div>
  )
}

function LiveTask({ task, onSaved, onClose }: { task: TaskType; onSaved: () => void; onClose: () => void }) {
  const hand = useHandTask(task, TASK_DURATION_SECONDS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    hand.setup()
    return hand.stopCamera
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.save({ profile_id: profileId(), task_type: task, duration_sec: TASK_DURATION_SECONDS, frames: hand.result.frames, frames_total: hand.result.frames_total })
      setSaved(true)
      onSaved()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save this session')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="task-modal" role="dialog" aria-modal="true" aria-label={`${taskCopy[task].title} task`}>
      <div className="task-panel">
        <button className="close" onClick={onClose} aria-label="Close task">×</button>
        <div className="eyebrow">Private {TASK_DURATION_SECONDS}-second check-in</div>
        <h2>{taskCopy[task].title}</h2>
        <p>{taskCopy[task].instruction}</p>
        <div className="camera">
          <video ref={hand.videoRef} muted playsInline />
          <canvas ref={hand.canvasRef} />
          <div className="camera-label"><span className="live-dot" />{hand.state === 'recording' ? `${hand.remaining}s remaining` : hand.state === 'complete' ? 'Capture complete' : 'Landmarks stay on this device'}</div>
        </div>
        {hand.state === 'loading' && <p className="helper">Preparing on-device hand tracking…</p>}
        {hand.state === 'error' && <p className="error">{hand.error}</p>}
        <div className="task-actions">
          {hand.state === 'ready' && <button className="primary" onClick={hand.start}>Start {TASK_DURATION_SECONDS}-second capture <span>→</span></button>}
          {hand.state === 'recording' && <button className="primary is-recording" disabled>Capturing movement…</button>}
          {hand.state === 'complete' && !saved && <button className="primary" disabled={saving} onClick={save}>{saving ? 'Analyzing landmarks…' : 'Save session analysis'} <span>→</span></button>}
          {saved && <div className="saved">✓ Session saved — your dashboard is refreshed.</div>}
        </div>
        <div className="privacy-strip"><span>⌁</span><small>Raw video is never uploaded. Only world-landmark coordinates are analyzed.</small></div>
      </div>
    </section>
  )
}

function App() {
  const [task, setTask] = useState<TaskType>('tapping')
  const [dashboard, setDashboard] = useState<Dashboard>()
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)

  async function load(selectedTask = task) {
    setLoading(true)
    try {
      setDashboard(await api.dashboard(profileId(), selectedTask))
    } catch {
      setDashboard(undefined)
    } finally {
      setLoading(false)
    }
  }

  async function loadDemo() {
    try {
      await api.seedDemo(profileId())
      setTask('tapping')
      await load('tapping')
    } catch {
      alert('Could not load demo history. Confirm the API is running.')
    }
  }

  useEffect(() => { load() }, [task])

  const latest = dashboard?.sessions.at(-1)
  const hasDemo = dashboard?.sessions.some(session => session.is_demo_data)
  const amplitudeTrend = dashboard?.trends.find(trend => trend.biomarker === 'amplitude_decay_ratio')
  const amplitudeFallback: Trend = { biomarker: 'amplitude_decay_ratio', baseline_ready: false, candidate: false, confirmed: false, reason: '', points: [] }
  const sessionCount = dashboard?.sessions.length || 0

  return (
    <>
      <main>
        <header>
          <a className="brand" href="#top"><span>✦</span> MotorSignal</a>
          <div className="header-note"><i /> Private motor-task tracking <b>·</b> Not a diagnosis</div>
        </header>

        <section className="hero" id="top">
          <div>
            <div className="eyebrow">Browser-side motion signals</div>
            <h1>Make the small changes <em>visible.</em></h1>
            <p className="lede">A calm, repeatable 15-second check-in that turns hand motion into a personal longitudinal signal.</p>
            <div className="hero-actions"><button className="primary" onClick={() => setLive(true)}>Begin a check-in <span>→</span></button><span>15 seconds · no account</span></div>
          </div>
          <aside className="privacy">
            <span className="privacy-icon">⌁</span><div><strong>Privacy by design</strong><p>MediaPipe tracks hands locally. Raw video never leaves this device.</p></div>
          </aside>
        </section>

        <nav className="task-tabs" aria-label="Task selection">
          {(Object.keys(taskCopy) as TaskType[]).map(key => <button key={key} className={task === key ? 'selected' : ''} onClick={() => setTask(key)}><i>{taskCopy[key].icon}</i><span>{taskCopy[key].title}<small>{taskCopy[key].short}</small></span></button>)}
        </nav>

        <section className="section-heading">
          <div><div className="eyebrow">Your {taskCopy[task].title.toLowerCase()} history</div><h2>Personal signal dashboard</h2></div>
          <div className="header-actions"><a className="ghost" target="_blank" rel="noreferrer" href={api.exportUrl(profileId(), task)}>Clinician summary ↗</a><button className="ghost" onClick={loadDemo}>Load demo history</button><button className="primary compact" onClick={() => setLive(true)}>New session <span>→</span></button></div>
        </section>

        {hasDemo && <div className="demo-notice"><span>Demo mode</span><p>These sessions are synthetic sample data used to demonstrate trend validation—not real measurements.</p></div>}

        {loading ? <div className="loading">Loading your personal dashboard…</div> : !dashboard ? <div className="loading error">The dashboard can’t reach the API. Start the FastAPI service at port 8000.</div> : <>
          <section className="metrics">
            <article className="metric-card"><div className="metric-top"><span>Latest movement rate</span><i>↗</i></div><strong>{formatMetric('rate_hz', latest?.biomarkers.rate_hz)}</strong><p>{latest ? `${latest.biomarkers.rep_count} detected cycles in ${latest.duration_sec}s` : 'Complete a check-in to begin'}</p></article>
            <article className="metric-card accent"><div className="metric-top"><span>Movement amplitude</span><i>⌁</i></div><strong>{formatMetric('amplitude_decay_ratio', latest?.biomarkers.amplitude_decay_ratio)}</strong><p>{amplitudeInsight(latest?.biomarkers.amplitude_decay_ratio)}</p></article>
            <article className="metric-card"><div className="metric-top"><span>Capture quality</span><i>✓</i></div><strong>{latest ? `${Math.round(latest.data_quality.hand_detected_pct * 100)}%` : '—'}</strong><p>Hand-detection coverage · minimum 80%</p></article>
          </section>

          <section className="history">
            <div className="chart-card">
              <div className="chart-title"><div><div className="eyebrow">Primary longitudinal signal</div><h3>Movement amplitude over time</h3></div><span className={amplitudeTrend?.confirmed ? 'tag confirmed' : 'tag'}>{amplitudeTrend?.confirmed ? 'Validated trend' : `${Math.min(sessionCount, 3)}/3 baseline sessions`}</span></div>
              <MiniChart trend={amplitudeTrend || amplitudeFallback} sessions={sessionCount} />
            </div>
            <aside className="validator">
              <div className="eyebrow">Two-pass validator</div><h3>Signal, then context.</h3>
              <p>One unusual session never becomes a conclusion. MotorSignal checks quality, establishes a personal reference range, then looks for repetition.</p>
              <div className="validator-steps"><span><b>01</b> Detect hand ≥80%</span><span><b>02</b> Build 3-session baseline</span><span><b>03</b> Confirm repeated change</span></div>
            </aside>
          </section>

          <section className="trends"><div className="trends-heading"><div><div className="eyebrow">Trend engine</div><h3>What your history says today</h3></div><span>Quality-checked · personal baseline</span></div><div>{dashboard.trends.map(trend => <TrendCard key={trend.biomarker} trend={trend} />)}</div></section>
        </>}
      </main>
      {live && <LiveTask task={task} onSaved={() => load()} onClose={() => setLive(false)} />}
      <footer><span>MotorSignal</span> is an exploratory demo. It does not diagnose, treat, or replace a clinician.</footer>
    </>
  )
}

export default App
