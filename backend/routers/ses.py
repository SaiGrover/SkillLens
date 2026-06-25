"""
SES Engine router.
Formula: SES = 0.40×FeatureScore + 0.35×ForecastScore + 0.25×ClusterScore

ForecastScore is now sourced from Forecast.forecast_score — the composite
normalised score computed by build_forecasts.py (11_Hybrid_Forecasting.ipynb).
No horizon lookup needed; it's a single pre-computed value per skill.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db
from models.skill import Skill, SESScore, ClusterAssignment, Forecast

router = APIRouter()

# Archetype → cluster score
ARCHETYPE_SCORE = {
    "Future-Proof": 1.00,
    "Growing":      0.75,
    "Stable":       0.55,
    "High-Risk":    0.25,
}

FEATURE_WEIGHTS = {
    "linkedin_demand":   0.25,
    "salary_premium":    0.20,
    "current_usage":     0.20,
    "future_interest":   0.15,
    "global_adoption":   0.10,
    "growth_rate":       0.10,
}

SES_TIERS = [
    (0.70, "Very Safe"),
    (0.45, "Safe"),
    (0.30, "Moderate"),
    (0, "Risky"),
]


def compute_ses_tier(score: float) -> str:
    for threshold, label in SES_TIERS:
        if score >= threshold:
            return label
    return "Risky"


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class SESRankEntry(BaseModel):
    rank: int
    skill_id: str
    skill_name: str
    ses_score: float
    ses_tier: str
    feature_score: float
    forecast_score: float
    cluster_score: float
    archetype: Optional[str]
    forecast_trend: Optional[str]    # new — from Forecast table
    forecast_method: Optional[str]   # new — from Forecast table
    ses_delta_30d: Optional[float]

    class Config:
        from_attributes = True


class SESExplainability(BaseModel):
    skill_id: str
    skill_name: str
    ses_score: float
    ses_tier: str
    breakdown: dict
    feature_contributions: dict
    forecast_meta: dict              # method, trend, confidence, horizon scores
    narrative: str


class SESDistribution(BaseModel):
    tier: str
    count: int
    percentage: float
    avg_ses: float


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/rankings", response_model=List[SESRankEntry])
async def ses_rankings(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    tier: Optional[str] = Query(None),
    archetype: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
):
    stmt = (
        select(Skill, SESScore, ClusterAssignment, Forecast)
        .join(SESScore, Skill.id == SESScore.skill_id)
        .outerjoin(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
        .outerjoin(Forecast, Skill.id == Forecast.skill_id)
    )
    if tier:
        stmt = stmt.where(SESScore.ses_tier == tier)
    if archetype:
        stmt = stmt.where(ClusterAssignment.archetype == archetype)
    if min_score is not None:
        stmt = stmt.where(SESScore.ses_score >= min_score)

    stmt = stmt.order_by(SESScore.ses_score.desc()).offset(offset).limit(limit)
    rows = (await db.execute(stmt)).all()

    return [
        SESRankEntry(
            rank=i + offset + 1,
            skill_id=skill.id,
            skill_name=skill.name,
            ses_score=round(ses.ses_score, 2),
            ses_tier=ses.ses_tier,
            feature_score=round(ses.feature_score or 0, 4),
            forecast_score=round(ses.forecast_score or 0, 4),
            cluster_score=round(ses.cluster_score or 0, 4),
            archetype=cluster.archetype if cluster else None,
            forecast_trend=forecast.forecast_trend if forecast else None,
            forecast_method=forecast.forecast_method if forecast else None,
            ses_delta_30d=ses.ses_delta_30d,
        )
        for i, (skill, ses, cluster, forecast) in enumerate(rows)
    ]


@router.get("/distribution", response_model=List[SESDistribution])
async def ses_distribution(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            SESScore.ses_tier,
            func.count().label("count"),
            func.avg(SESScore.ses_score).label("avg_ses"),
        )
        .group_by(SESScore.ses_tier)
    )
    rows = result.fetchall()
    total = sum(r[1] for r in rows)
    tier_order = ["Very Safe", "Safe", "Moderate", "Risky"]
    row_map = {r[0]: r for r in rows}

    return [
        SESDistribution(
            tier=tier,
            count=row_map[tier][1] if tier in row_map else 0,
            percentage=round(row_map[tier][1] / total * 100, 1) if tier in row_map else 0.0,
            avg_ses=round(row_map[tier][2], 2) if tier in row_map else 0.0,
        )
        for tier in tier_order
        if tier in row_map
    ]


@router.get("/explain/{skill_id}", response_model=SESExplainability)
async def explain_ses(skill_id: str, db: AsyncSession = Depends(get_db)):
    """Full SES explainability breakdown for a single skill."""
    stmt = (
        select(Skill)
        .where(Skill.id == skill_id)
        .options(
            selectinload(Skill.ses_score),
            selectinload(Skill.cluster),
            selectinload(Skill.forecast),
        )
    )
    skill = (await db.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(404, f"Skill '{skill_id}' not found")

    ses     = skill.ses_score
    cluster = skill.cluster
    fc      = skill.forecast

    # Feature contributions
    feature_contribs = {
        feat: round(getattr(skill, feat, 0.0) * weight, 4)
        for feat, weight in FEATURE_WEIGHTS.items()
    }
    raw_feature = sum(feature_contribs.values())

    # Forecast score — directly from Forecast.forecast_score (already normalised)
    forecast_component = fc.forecast_score if fc else raw_feature

    # Cluster score
    archetype_label   = cluster.archetype if cluster else "Stable"
    cluster_component = ARCHETYPE_SCORE.get(archetype_label, 0.55)

    recomputed_ses = (
        0.40 * raw_feature
        + 0.35 * forecast_component
        + 0.25 * cluster_component
    )

    stored_ses = ses.ses_score if ses else round(recomputed_ses, 2)

    narrative = (
        f"{skill.name} has an SES of {round(stored_ses * 100, 1)} out of 100. "
        f"Its Feature Score ({round(raw_feature * 100, 1)}) reflects "
        f"{'strong' if raw_feature > 0.7 else 'moderate' if raw_feature > 0.4 else 'weak'} "
        f"current market demand. "
        f"The forecast score ({round(forecast_component * 100, 1)}) was computed via "
        f"{fc.forecast_method if fc else 'FeatureBased'} "
        f"(confidence: {round((fc.confidence or 0) * 100, 0):.0f}%) "
        f"and indicates a '{fc.forecast_trend if fc else 'Stable'}' outlook. "
        f"Its archetype '{archetype_label}' contributes a cluster score of "
        f"{round(cluster_component * 100, 1)}."
    )

    return SESExplainability(
        skill_id=skill.id,
        skill_name=skill.name,
        ses_score=round(stored_ses, 2),
        ses_tier=ses.ses_tier if ses else compute_ses_tier(recomputed_ses),
        breakdown={
            "feature_score_raw":     round(raw_feature, 4),
            "feature_weighted":      round(raw_feature * 0.40, 4),
            "forecast_score_raw":    round(forecast_component, 4),
            "forecast_weighted":     round(forecast_component * 0.35, 4),
            "cluster_score_raw":     round(cluster_component, 4),
            "cluster_weighted":      round(cluster_component * 0.25, 4),
        },
        feature_contributions=feature_contribs,
        forecast_meta={
            "method":           fc.forecast_method if fc else None,
            "trend":            fc.forecast_trend if fc else None,
            "confidence":       fc.confidence if fc else None,
            "history_length":   fc.history_length if fc else None,
            "forecast_score_1y": fc.forecast_score_1y if fc else None,
            "forecast_score_2y": fc.forecast_score_2y if fc else None,
            "forecast_score_3y": fc.forecast_score_3y if fc else None,
        },
        narrative=narrative,
    )


@router.get("/heatmap")
async def ses_heatmap(db: AsyncSession = Depends(get_db)):
    """Category × tier matrix for the extinction heatmap visualization."""
    stmt = (
        select(
            Skill.category,
            SESScore.ses_tier,
            func.count().label("count"),
            func.avg(SESScore.ses_score).label("avg_ses"),
        )
        .join(SESScore, Skill.id == SESScore.skill_id)
        .where(Skill.category.isnot(None))
        .group_by(Skill.category, SESScore.ses_tier)
    )
    rows = (await db.execute(stmt)).fetchall()
    return [
        {
            "category": r[0],
            "tier":     r[1],
            "count":    r[2],
            "avg_ses":  round(r[3], 2),
        }
        for r in rows
    ]
