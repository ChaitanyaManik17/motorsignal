import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Frame, TaskType } from './types'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
export function useHandTask(task: TaskType, seconds = 15) {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null), landmarker = useRef<HandLandmarker | null>(null)
  const raf = useRef<number>(), stream = useRef<MediaStream>(), startedAt = useRef(0), frames = useRef<Frame[]>([]), total = useRef(0)
  const [state, setState] = useState<'idle'|'loading'|'ready'|'recording'|'complete'|'error'>('idle'), [remaining, setRemaining] = useState(seconds), [error, setError] = useState('')
  const setup = useCallback(async () => {
    try {
      setState('loading'); setError('')
      const vision = await FilesetResolver.forVisionTasks(WASM)
      landmarker.current = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: .55, minTrackingConfidence: .55 })
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      if (videoRef.current) { videoRef.current.srcObject = stream.current; await videoRef.current.play() }
      setState('ready')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Camera setup failed'); setState('error') }
  }, [])
  const stopCamera = useCallback(() => { cancelAnimationFrame(raf.current || 0); stream.current?.getTracks().forEach(t => t.stop()) }, [])
  const start = useCallback(() => { if (!landmarker.current || !videoRef.current) return; frames.current=[]; total.current=0; startedAt.current=performance.now(); setRemaining(seconds); setState('recording') }, [seconds])
  useEffect(() => {
    const render = () => {
      const video = videoRef.current, canvas = canvasRef.current
      if (!video || !canvas || !landmarker.current || video.readyState < 2) { raf.current=requestAnimationFrame(render); return }
      const now = performance.now(), result = landmarker.current.detectForVideo(video, now)
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const ctx=canvas.getContext('2d')!; ctx.clearRect(0,0,canvas.width,canvas.height)
      if (result.landmarks[0]) {
        ctx.fillStyle='#9df7d5'; for (const p of result.landmarks[0]) { ctx.beginPath(); ctx.arc(p.x*canvas.width,p.y*canvas.height,4,0,Math.PI*2);ctx.fill() }
      }
      if (state === 'recording') {
        total.current++
        if (result.worldLandmarks[0]) frames.current.push({ timestamp_ms: now-startedAt.current, landmarks: result.worldLandmarks[0].map(p => ({x:p.x,y:p.y,z:p.z})) })
        const elapsed=(now-startedAt.current)/1000; setRemaining(Math.max(0, Math.ceil(seconds-elapsed)))
        if (elapsed >= seconds) { setState('complete'); return }
      }
      raf.current=requestAnimationFrame(render)
    }
    raf.current=requestAnimationFrame(render); return () => cancelAnimationFrame(raf.current || 0)
  }, [state, seconds])
  return { videoRef, canvasRef, state, remaining, error, setup, start, stopCamera, result: { frames: frames.current, frames_total: total.current, task } }
}
