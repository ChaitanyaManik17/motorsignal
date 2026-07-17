# MotorSignal

MotorSignal is a privacy-forward motor-task demo. The webcam stays in the browser; the API receives only timestamped hand landmark coordinates and calculated session metrics.

It supports two 15-second guided tasks:

- **Finger tapping** — thumb-tip to index-tip distance (world landmarks 4 and 8).
- **Pronation / supination proxy** — index-MCP to pinky-MCP distance (world landmarks 5 and 17).

The dashboard derives repetition count, rate, amplitude decay, and rhythm variability. After three valid sessions it establishes a personal baseline. Potential changes need to recur in the same direction in two consecutive sessions before they are shown as a confirmed trend.

> This is a research/demo aid, not a diagnostic device or medical advice. Demo history is clearly labeled synthetic.

## Run locally

### API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

The API uses memory when `MONGO_URI` is absent. Add `MONGO_URI` (and optionally `MONGO_DB=motor_signal`) to persist in MongoDB Atlas.

### Web app

```bash
cd frontend
npm install
npm run dev
```

Open the printed Vite URL, allow camera access, then choose a task. Set `VITE_API_URL` for a deployed API; it defaults to `http://localhost:8000`.

## Demo data and deployment

Seed a clearly synthetic, three-week history with:

```bash
cd backend
python3 scripts/seed_demo_data.py --profile-id demo-profile
```

When running with in-memory storage locally, use the **Load demo history** button in the dashboard instead; it loads the same data into the running API process.

Deploy `frontend` to Vercel (set `VITE_API_URL`) and `backend` to Render/Railway (set `MONGO_URI` and `CORS_ORIGINS`). The API provides `/docs` for an interactive schema reference.

`render.yaml`, `frontend/vercel.json`, and both `.env.example` files are included for deployment. Use the exact narration, Devpost copy, and recording checklist in [SUBMISSION.md](./SUBMISSION.md).

### Submission-grade production checklist

1. Create a MongoDB Atlas database user and put its URI in the backend host's `MONGO_URI` variable.
2. Deploy the backend from the repository root using `render.yaml`, then set `CORS_ORIGINS` to the deployed Vercel URL.
3. Deploy the `frontend` folder in Vercel and set `VITE_API_URL` to the deployed API URL, then redeploy.
4. Open the live URL over HTTPS and complete a task—the browser requires HTTPS for webcam access outside localhost.
5. Use **Load demo history** immediately before recording. The visible synthetic-data notice must remain part of the demo.

## Privacy story

MediaPipe runs fully in the client. Raw frames are drawn only to the on-page canvas and never uploaded. The backend accepts a compact sequence of MediaPipe **world-landmark coordinates** to calculate metrics, plus the local-browser profile ID and resulting session metadata.
