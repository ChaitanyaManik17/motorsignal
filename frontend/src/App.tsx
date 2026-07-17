import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useHandTask } from './useHandTask'
import type { Dashboard, TaskType, Trend } from './types'

const PROFILE_KEY='motorsignal-profile'
function profileId() { let id=localStorage.getItem(PROFILE_KEY); if (!id) { id=crypto.randomUUID(); localStorage.setItem(PROFILE_KEY,id) } return id }
const taskCopy: Record<TaskType, { title:string; short:string; instruction:string }> = {
  tapping: { title:'Finger tapping', short:'Thumb ↔ index', instruction:'Hold your hand in view and repeatedly tap your thumb to your index finger at a comfortable, consistent pace.' },
  pronation_supination: { title:'Hand rotation', short:'Palm width proxy', instruction:'Hold your hand up and rotate your palm smoothly back and forth, keeping your wrist in frame.' },
}
function value(metric:string, n:number|undefined|null) { if (n === null || n === undefined) return '—'; if(metric==='rate_hz') return `${n.toFixed(2)} Hz`; if(metric==='rhythm_cv') return n.toFixed(3); return `${(n*100).toFixed(0)}%` }

function TrendCard({ trend }: {trend:Trend}) {
  const label=trend.biomarker.replaceAll('_',' ')
  return <article className={`trend-card ${trend.confirmed ? 'alert' : ''}`}>
    <div className="eyebrow">{label}</div>
    <strong>{trend.confirmed ? `Confirmed ${trend.direction} shift` : trend.candidate ? 'Watching one change' : trend.baseline_ready ? 'Within personal range' : 'Building baseline'}</strong>
    <p>{trend.reason}</p>
    {trend.current_z_score !== undefined && <small>Latest z-score: {trend.current_z_score > 0 ? '+' : ''}{trend.current_z_score}</small>}
  </article>
}
function MiniChart({ trend }: {trend:Trend}) {
  const vals=trend.points.map(p=>p.value).filter((v):v is number=>v!==null)
  if(vals.length<2) return <div className="empty-chart">Complete sessions to see a personal trend.</div>
  const min=Math.min(...vals), max=Math.max(...vals), spread=max-min || 1
  const coords=vals.map((v,i)=>`${(i/(vals.length-1))*100},${88-((v-min)/spread)*70}`).join(' ')
  return <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`${trend.biomarker} history`}><line x1="0" y1="88" x2="100" y2="88"/><polyline points={coords}/>{vals.map((v,i)=><circle key={i} cx={(i/(vals.length-1))*100} cy={88-((v-min)/spread)*70} r="1.8"/>)}</svg>
}
function LiveTask({ task, onSaved, onClose }: { task:TaskType; onSaved:()=>void; onClose:()=>void }) {
  const hand=useHandTask(task); const [saving,setSaving]=useState(false), [saved,setSaved]=useState(false)
  useEffect(()=>{ hand.setup(); return hand.stopCamera }, []) // setup is deliberately once per modal
  const save=async()=>{ setSaving(true); try { await api.save({ profile_id: profileId(), task_type: task, duration_sec: 15, frames: hand.result.frames, frames_total: hand.result.frames_total }); setSaved(true); onSaved() } catch(e) { alert(e instanceof Error?e.message:'Could not save this session') } finally { setSaving(false) } }
  return <section className="task-modal" role="dialog" aria-modal="true"><div className="task-panel"><button className="close" onClick={onClose}>×</button><div className="eyebrow">15-second guided task</div><h2>{taskCopy[task].title}</h2><p>{taskCopy[task].instruction}</p><div className="camera"><video ref={hand.videoRef} muted playsInline/><canvas ref={hand.canvasRef}/><div className="camera-label">{hand.state==='recording' ? `${hand.remaining}s` : hand.state==='complete' ? 'Capture complete' : 'Landmarks stay on this device'}</div></div>{hand.state==='loading' && <p>Loading private, on-device hand tracking…</p>}{hand.state==='error' && <p className="error">{hand.error}</p>}<div className="task-actions">{hand.state==='ready' && <button className="primary" onClick={hand.start}>Start 15-second capture</button>}{hand.state==='recording' && <button disabled>Recording {hand.remaining}s</button>}{hand.state==='complete' && !saved && <button className="primary" disabled={saving} onClick={save}>{saving?'Saving landmark analysis…':'Save session analysis'}</button>}{saved && <div className="saved">Session saved. Your dashboard has refreshed.</div>}</div><small>Video is not uploaded. Only world-landmark coordinates are analyzed.</small></div></section>
}
function App() {
  const [task,setTask]=useState<TaskType>('tapping'), [dashboard,setDashboard]=useState<Dashboard>(), [loading,setLoading]=useState(true), [live,setLive]=useState(false)
  const load=async()=>{ setLoading(true); try { setDashboard(await api.dashboard(profileId(),task)) } catch { setDashboard(undefined) } finally { setLoading(false) } }
  const loadDemo=async()=>{ try { await api.seedDemo(profileId()); setTask('tapping'); await load() } catch { alert('Could not load demo history. Confirm the API is running.') } }
  useEffect(()=>{ load() },[task])
  const recent=dashboard?.sessions.at(-1)
  const demo=dashboard?.sessions.some(s=>s.is_demo_data)
  const amplitudeTrend = dashboard?.trends.find(t=>t.biomarker==='amplitude_decay_ratio')
  const emptyTrend: Trend = { biomarker: 'amplitude_decay_ratio', baseline_ready: false, candidate: false, confirmed: false, reason: '', points: [] }
  return <><main><header><a className="brand" href="#top"><span>✦</span> MotorSignal</a><p>Private motor-task tracking · not a diagnosis</p></header><section className="hero" id="top"><div><div className="eyebrow">Browser-side motion signals</div><h1>Make the small changes <em>visible.</em></h1><p className="lede">A calm, repeatable 15-second hand task. Your camera stays in the browser; only derived landmark coordinates are analyzed.</p><button className="primary" onClick={()=>setLive(true)}>Begin a check-in <span>→</span></button></div><aside className="privacy"><span className="privacy-icon">⌁</span><strong>Privacy by design</strong><p>MediaPipe tracks hands locally. Raw video never leaves this device.</p></aside></section><nav className="task-tabs" aria-label="Task selection">{(Object.keys(taskCopy) as TaskType[]).map(key=><button key={key} className={task===key?'selected':''} onClick={()=>setTask(key)}><span>{taskCopy[key].title}</span><small>{taskCopy[key].short}</small></button>)}</nav><section className="section-heading"><div><div className="eyebrow">Your {taskCopy[task].title.toLowerCase()} history</div><h2>Personal signal dashboard</h2></div><div className="header-actions"><a className="ghost" target="_blank" rel="noreferrer" href={api.exportUrl(profileId(), task)}>Clinician summary ↗</a><button className="ghost" onClick={loadDemo}>Load demo history</button><button className="ghost" onClick={()=>setLive(true)}>New session</button></div></section>{demo && <div className="demo-notice"><strong>Demo history</strong><span>These sessions are synthetic sample data to demonstrate trend validation; they are not real measurements.</span></div>}{loading ? <div className="loading">Loading your protected local profile…</div> : !dashboard ? <div className="loading error">The dashboard can’t reach the API. Start the FastAPI service at port 8000.</div> : <><section className="metrics"><article><div className="eyebrow">Latest rate</div><strong>{value('rate_hz',recent?.biomarkers.rate_hz)}</strong><span>{recent ? `${recent.biomarkers.rep_count} detected cycles` : 'No sessions yet'}</span></article><article><div className="eyebrow">Amplitude decay</div><strong>{value('amplitude_decay_ratio',recent?.biomarkers.amplitude_decay_ratio)}</strong><span>Second half ÷ first half</span></article><article><div className="eyebrow">Detection quality</div><strong>{recent ? `${Math.round(recent.data_quality.hand_detected_pct*100)}%` : '—'}</strong><span>Minimum for trends: 80%</span></article></section><section className="history"><div className="chart-card"><div className="chart-title"><div><div className="eyebrow">Primary clinical signal</div><h3>Amplitude decay</h3></div><span>{amplitudeTrend?.confirmed?'Validated trend':'Personal baseline'}</span></div><MiniChart trend={amplitudeTrend || emptyTrend}/><div className="chart-foot"><span>Earlier</span><span>Latest</span></div></div><div className="validator"><div className="eyebrow">Two-pass validator</div><h3>Signal, then context.</h3><p>We only surface a shift after quality checks, a stable baseline, and two same-direction sessions. One noisy check-in stays a candidate.</p><ol><li>Hand detected &gt;80% and task ≥12 sec</li><li>Three valid sessions establish baseline</li><li>Two matching outliers confirm a trend</li></ol></div></section><section className="trends"><h3>What the trend engine sees</h3><div>{dashboard.trends.map(t=><TrendCard key={t.biomarker} trend={t}/>)}</div></section></>}</main>{live && <LiveTask task={task} onSaved={load} onClose={()=>setLive(false)}/>}<footer>MotorSignal is an exploratory demo. It does not diagnose, treat, or replace a clinician.</footer></>
}
export default App
