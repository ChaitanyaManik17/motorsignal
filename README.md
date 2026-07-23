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

## Free deployment: Vercel + MongoDB Atlas

Seed a clearly synthetic, three-week history with:

```bash
cd backend
python3 scripts/seed_demo_data.py --profile-id demo-profile
```

When running with in-memory storage locally, use the **Load demo history** button in the dashboard instead; it loads the same data into the running API process.

Deploy both services using Vercel's free Hobby plan; this project includes the FastAPI Vercel entry point at `backend/app/app.py`. Use MongoDB Atlas's Free cluster for persistent demo data. The API provides `/docs` for an interactive schema reference.

`frontend/vercel.json`, `backend/vercel.json`, and both `.env.example` files are included. Use the exact narration, Devpost copy, and recording checklist in [SUBMISSION.md](./SUBMISSION.md).



## Privacy story

MediaPipe runs fully in the client. Raw frames are drawn only to the on-page canvas and never uploaded. The backend accepts a compact sequence of MediaPipe **world-landmark coordinates** to calculate metrics, plus the local-browser profile ID and resulting session metadata.

## Built with Codex and GPT-5.6

MotorSignal was planned, implemented, tested, and prepared for deployment in a Codex session powered by GPT-5.6. Codex helped turn the initial product brief into the React/Vite interface, FastAPI data model and signal-processing pipeline, synthetic trend data, unit tests, deployment configuration, and the submission documentation. The final implementation decisions were reviewed against the project goal: preserve browser-only video handling, make demo data unmistakably synthetic, and avoid diagnostic claims.
