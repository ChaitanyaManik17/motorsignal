"""Vercel FastAPI entry point.

Vercel discovers the `app` object in `app/app.py` when the backend directory is
deployed as its own Vercel project. Routes and application configuration live in
`main.py` so the same API also runs locally with uvicorn.
"""

from .main import app

