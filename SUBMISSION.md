# MotorSignal — Devpost submission kit

## One-line pitch

MotorSignal turns a private, repeatable 15-second hand task into understandable longitudinal motor signals—without uploading a single video frame.

## Inspiration

Changes in movement are often subtle, intermittent, and difficult to describe from memory. A person may notice that tapping feels different long before a clinic visit captures it. We wanted a low-friction way to make that observation more concrete while refusing the usual privacy tradeoff of sending a webcam feed to a server.

## What it does

MotorSignal guides a user through two short browser-based tasks: finger tapping and a hand-rotation proxy. MediaPipe detects a hand locally in the browser. The app sends only compact world-landmark coordinates to the API, which calculates repetition rate, amplitude decay, rhythm variability, and capture quality.

After three high-quality sessions, MotorSignal establishes a personal baseline. It flags a potential change at a 1.5 standard-deviation shift, but only confirms it after two consecutive same-direction sessions. The dashboard explicitly labels synthetic demo history and makes clear that it is not a diagnosis. A print-friendly clinician summary communicates results and the data-handling story.

## How we built it

- React + Vite frontend with a local browser profile ID—no authentication barrier for a demo.
- `@mediapipe/tasks-vision` runs HandLandmarker in browser video mode.
- Finger tapping measures world-landmark distance from thumb tip (4) to index tip (8).
- Hand rotation uses the periodic on-screen palm-width proxy between index MCP (5) and pinky MCP (17).
- FastAPI + SciPy detects peaks/troughs and derives biomarker values.
- MongoDB Atlas Free provides durable demo sessions; memory storage makes local judging frictionless.
- Two Vercel projects deploy the frontend and FastAPI API with no paid host required.

## How Codex and GPT-5.6 helped

I used Codex with GPT-5.6 as the implementation partner for this project: translating the product specification into the working frontend and API, shaping the landmark-only data model and trend-validation rules, writing tests and seed data, and preparing the Vercel/MongoDB Atlas deployment configuration. I used the resulting code and checks as a starting point, then reviewed the safety language, product claims, and submission materials to ensure they describe the implemented demo accurately.

## The difficult parts

The central technical risk was making webcam tracking useful without making video collection part of the product. The landmark-only boundary keeps raw frames on-device, but demanded a more robust measurement choice: MediaPipe world landmarks reduce apparent movement caused by shifting toward the camera. The other hard problem was avoiding “one noisy session equals an alert.” The two-pass trend validator checks data quality, duration, stable baseline variation, and repeated same-direction change before a dashboard alert is confirmed.

## Accomplishments we’re proud of

- A complete live task → analysis → longitudinal trend → export loop.
- A privacy story that is enforced by architecture, not a policy promise.
- Trend output that resists false positives instead of pretending a single score is clinical truth.
- Synthetic demo history that is impossible to mistake for real user data in the interface.

## What’s next

We would validate task instructions and signal thresholds with clinicians, add true palm-plane rotation from world landmarks, support accessibility modes and multiple hands, and perform formal reliability testing before considering any medical use.

## Demo video outline (under three minutes)

1. **0:00–0:15** — Show the dashboard and make the privacy promise: “raw video never leaves this browser.”
2. **0:15–0:45** — Run a live finger-tapping capture with the landmark overlay visible.
3. **0:45–1:30** — Load synthetic demo history, show the amplitude-decay chart and confirmed two-session trend. Say: “This is not a diagnosis.”
4. **1:30–2:30** — Explain the architecture boundary, world landmarks, and the validator’s quality/baseline/consistency checks.
5. **2:30–3:00** — Open the clinician one-pager and close with the next-step vision.

## Submission checklist

- [ ] Deploy `backend/` as a Vercel project; set `MONGO_URI`, `MONGO_DB`, and `CORS_ORIGINS`.
- [ ] Deploy `frontend/` as a second Vercel project; set `VITE_API_URL` to the API URL.
- [ ] Verify a live webcam session on the deployment (HTTPS is required for camera access).
- [ ] Load synthetic history for the video demo and keep its visible label in frame.
- [ ] Add the deployed URL, demo video URL, repository URL, and this description to Devpost.
- [ ] Do not claim diagnosis, clinical validation, or medical-device status.
