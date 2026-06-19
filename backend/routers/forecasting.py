"""
Forecasting router — serves hybrid forecast results.
Schema matches 11_Hybrid_Forecasting.ipynb output:
  forecast_1y / 2y / 3y  (raw demand counts)
  forecast_score          (composite normalised score used by SES)
  forecast_method         Holt | ExponentialSmoothing | FeatureBased
  forecast_trend          Explosive | Growing | Stable | Declining
  confidence              model confidence [0, 1]
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db
from models.skill import Skill, Forecast, SkillHistory, SESScore, ClusterAssignment

router = APIRouter()


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class SkillForecastResponse(BaseModel):
    skill_id: str
    skill_name: str
    history: List[dict]          # [{year, demand, adoption_rate}]
    # Raw forecasts (demand count units)
    forecast_1y: Optional[float]
    forecast_2y: Optional[float]
    forecast_3y: Optional[float]
    # Normalised intelligence scores [0, 1]
    forecast_score_1y: Optional[float]
    forecast_score_2y: Optional[float]
    forecast_score_3y: Optional[float]
    forecast_score: Optional[float]   # composite — used by SES
    # Metadata
    forecast_method: Optional[str]
    forecast_trend: Optional[str]
    confidence: Optional[float]
    history_length: Optional[int]
    archetype: Optional[str]


class ComparisonResponse(BaseModel):
    skills: List[SkillForecastResponse]


class LeaderboardEntry(BaseModel):
    skill_id: str
    skill_name: str
    forecast_3y: float
    forecast_1y: float
    growth_pct: float
    forecast_trend: str
    forecast_method: str
    confidence: float


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_response(skill: Skill) -> SkillForecastResponse:
    fc = skill.forecast
    history = sorted(
        [
            {
                "year": h.year,
                "demand": h.demand,
                "adoption_rate": h.adoption_rate,
            }
            for h in (skill.history or [])
        ],
        key=lambda x: x["year"],
    )
    archetype = skill.cluster.archetype if skill.cluster else None

    return SkillForecastResponse(
        skill_id=skill.id,
        skill_name=skill.name,
        history=history,
        forecast_1y=fc.forecast_1y if fc else None,
        forecast_2y=fc.forecast_2y if fc else None,
        forecast_3y=fc.forecast_3y if fc else None,
        forecast_score_1y=fc.forecast_score_1y if fc else None,
        forecast_score_2y=fc.forecast_score_2y if fc else None,
        forecast_score_3y=fc.forecast_score_3y if fc else None,
        forecast_score=fc.forecast_score if fc else None,
        forecast_method=fc.forecast_method if fc else None,
        forecast_trend=fc.forecast_trend if fc else None,
        confidence=fc.confidence if fc else None,
        history_length=fc.history_length if fc else None,
        archetype=archetype,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{skill_id}", response_model=SkillForecastResponse)
async def get_skill_forecast(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Skill)
        .where(Skill.id == skill_id)
        .options(
            selectinload(Skill.forecast),
            selectinload(Skill.history),
            selectinload(Skill.cluster),
        )
    )
    skill = (await db.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(404, f"Skill '{skill_id}' not found")

    return _build_response(skill)


@router.get("/compare/skills", response_model=ComparisonResponse)
async def compare_forecasts(
    skill_ids: str = Query(..., description="Comma-separated skill IDs, max 6"),
    db: AsyncSession = Depends(get_db),
):
    ids = [s.strip() for s in skill_ids.split(",")][:6]

    stmt = (
        select(Skill)
        .where(Skill.id.in_(ids))
        .options(
            selectinload(Skill.forecast),
            selectinload(Skill.history),
            selectinload(Skill.cluster),
        )
    )
    skills = (await db.execute(stmt)).scalars().unique().all()

    return ComparisonResponse(skills=[_build_response(s) for s in skills])


@router.get("/leaderboard/future-proof", response_model=List[LeaderboardEntry])
async def future_proof_leaderboard(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, le=50),
    trend: Optional[str] = Query(None, description="Filter by trend: Explosive, Growing, Stable, Declining"),
):
    """
    Skills with highest 3-year forecast demand, ranked by growth %.
    growth_pct = (forecast_3y - forecast_1y) / max(forecast_1y, 1) × 100
    """
    stmt = (
        select(Skill)
        .join(Forecast, Skill.id == Forecast.skill_id)
        .options(selectinload(Skill.forecast))
    )
    if trend:
        stmt = stmt.where(Forecast.forecast_trend == trend)

    stmt = stmt.order_by(Forecast.forecast_3y.desc()).limit(limit * 3)
    skills = (await db.execute(stmt)).scalars().unique().all()

    entries = []
    for sk in skills:
        fc = sk.forecast
        if not fc or fc.forecast_1y is None or fc.forecast_3y is None:
            continue
        growth_pct = (
            (fc.forecast_3y - fc.forecast_1y) / max(abs(fc.forecast_1y), 1)
        ) * 100
        entries.append(
            LeaderboardEntry(
                skill_id=sk.id,
                skill_name=sk.name,
                forecast_3y=round(fc.forecast_3y, 2),
                forecast_1y=round(fc.forecast_1y, 2),
                growth_pct=round(growth_pct, 1),
                forecast_trend=fc.forecast_trend or "Stable",
                forecast_method=fc.forecast_method or "FeatureBased",
                confidence=round(fc.confidence or 0, 2),
            )
        )

    entries.sort(key=lambda x: x.growth_pct, reverse=True)
    return entries[:limit]


@router.get("/method/distribution")
async def method_distribution(db: AsyncSession = Depends(get_db)):
    """How many skills used each forecasting method."""
    from sqlalchemy import func
    result = await db.execute(
        select(
            Forecast.forecast_method,
            func.count().label("count"),
            func.avg(Forecast.confidence).label("avg_confidence"),
        )
        .group_by(Forecast.forecast_method)
    )
    return [
        {
            "method": r[0],
            "count": r[1],
            "avg_confidence": round(r[2] or 0, 3),
            "description": {
                "Holt":                "Holt's damped trend — ≥10 years of history",
                "ExponentialSmoothing":"Additive exponential smoothing — 7–9 years of history",
                "FeatureBased":        "Feature-weighted compound growth — <7 years of history",
            }.get(r[0], r[0]),
        }
        for r in result.fetchall()
    ]


@router.get("/trend/distribution")
async def trend_distribution(db: AsyncSession = Depends(get_db)):
    """Count of skills per forecast trend label."""
    from sqlalchemy import func
    result = await db.execute(
        select(
            Forecast.forecast_trend,
            func.count().label("count"),
            func.avg(Forecast.forecast_score).label("avg_score"),
        )
        .group_by(Forecast.forecast_trend)
        .order_by(func.count().desc())
    )
    return [
        {
            "trend": r[0],
            "count": r[1],
            "avg_forecast_score": round(r[2] or 0, 4),
        }
        for r in result.fetchall()
    ]
