from pathlib import Path

from dotenv import load_dotenv

# Load ./backend/.env before routers read GOOGLE_API_KEY
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import drugs, compare, ai, policies, ingest

app = FastAPI(title="Policy Lens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drugs.router)
app.include_router(compare.router)
app.include_router(ai.router)
app.include_router(policies.router)
app.include_router(ingest.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
