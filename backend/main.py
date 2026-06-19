"""
SkillLens AI — FastAPI Backend v4
Production-grade workforce intelligence platform.

Pipeline run order (data/processed/ must exist):
  1. python pipelines/build_clusters.py
  2. python pipelines/build_forecasts.py
  3. python pipelines/build_ses.py
  4. python pipelines/build_industry_analytics.py
  5. python pipelines/build_knowledge_base.py   ← NEW (Career Advisor RAG)
  6. python pipelines/build_skill_master.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from core.database import engine, Base
from core.config import settings
from routers import (
    skills, clustering, forecasting, ses,
    industries, global_demand, career, approach, advisor,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skilllens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SkillLens AI v4 starting up...")
    app.state.database_ready = False
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        app.state.database_ready = True
        logger.info("Database tables ready.")
    except Exception as exc:
        logger.warning(
            "Database unavailable at startup. API will stay online in degraded mode: %s",
            exc,
        )
    yield
    logger.info("SkillLens AI shutting down.")


app = FastAPI(
    title="SkillLens AI API v4",
    description=(
        "HSEP — Human Skill Extinction Predictor. "
        "Real ML pipelines, real data. "
        "Career Advisor powered by OpenRouter (openai/gpt-oss-120b:free) + FAISS RAG."
    ),
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(skills.router,        prefix="/api/skills",        tags=["Skills"])
app.include_router(clustering.router,    prefix="/api/clustering",    tags=["Clustering"])
app.include_router(forecasting.router,   prefix="/api/forecasting",   tags=["Forecasting"])
app.include_router(ses.router,           prefix="/api/ses",           tags=["SES Engine"])
app.include_router(industries.router,    prefix="/api/industries",    tags=["Industries"])
app.include_router(global_demand.router, prefix="/api/global",        tags=["Global Demand"])
app.include_router(career.router,        prefix="/api/career",        tags=["Career Intelligence"])
app.include_router(advisor.router,       prefix="/api/advisor",       tags=["AI Advisor"])
app.include_router(approach.router,      prefix="/api/approach",      tags=["Pipeline Metadata"])


@app.get("/")
async def root():
    return {
        "name":        "SkillLens AI",
        "version":     "4.0.0",
        "description": "Human Skill Extinction Predictor — Production API",
        "status":      "operational",
        "advisor":     {
            "model":     settings.OPENROUTER_MODEL,
            "retriever": "FAISS (faiss-cpu) + keyword fallback",
            "kb_path":   settings.KB_PATH,
        },
    }


@app.get("/health")
async def health():
    database_ready = bool(getattr(app.state, "database_ready", False))
    return {
        "status": "healthy" if database_ready else "degraded",
        "services": {
            "database":      "ok" if database_ready else "unavailable",
            "ml_engine":     "ok",
            "rag_advisor":   "ok",
            "forecasting":   "ok",
            "ses_engine":    "ok",
        },
    }
