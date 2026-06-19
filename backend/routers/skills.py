"""
Skills router — serves from expanded_skill_master.csv + ses_rankings.csv loaded
into PostgreSQL. Supports search, pagination, multi-field filtering, and sorting.

Forecast relationship updated: Skill.forecast is now a single-row relationship
(uselist=False) matching the 11_Hybrid_Forecasting.ipynb one-row-per-skill schema.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
import math

from core.database import get_db
from models.skill import Skill, SESScore, ClusterAssignment, Forecast

router = APIRouter()


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class SkillSummary(BaseModel):
    id: str
    name: str
    category: Optional[str]
    lifecycle: Optional[str]
    ses_score: Optional[float]
    ses_tier: Optional[str]
    archetype: Optional[str]
    growth_rate: Optional[float]
    linkedin_demand: Optional[float]
    salary_premium: Optional[float]
    forecast_1y: Optional[float]     # replaces forecast_12m
    forecast_trend: Optional[str]    # Explosive | Growing | Stable | Declining
    forecast_method: Optional[str]   # Holt | ExponentialSmoothing | FeatureBased

    class Config:
        from_attributes = True


class SkillDetail(BaseModel):
    id: str
    name: str
    category: Optional[str]
    subcategory: Optional[str]
    lifecycle: Optional[str]
    description: Optional[str]
    # Feature vector
    linkedin_demand: Optional[float]
    salary_premium: Optional[float]
    current_usage: Optional[float]
    future_interest: Optional[float]
    global_adoption: Optional[float]
    growth_rate: Optional[float]
    momentum_score: Optional[float]
    volatility_score: Optional[float]
    growth_consistency: Optional[float]
    cagr: Optional[float]
    trend_slope: Optional[float]
    # SES
    ses_score: Optional[float]
    ses_tier: Optional[str]
    feature_score: Optional[float]
    forecast_score: Optional[float]
    cluster_score: Optional[float]
    ses_delta_30d: Optional[float]
    # Cluster
    cluster_id: Optional[int]
    archetype: Optional[str]
    pca_x: Optional[float]
    pca_y: Optional[float]
    # Hybrid forecasts (one row per skill)
    forecast_1y: Optional[float]
    forecast_2y: Optional[float]
    forecast_3y: Optional[float]
    forecast_score_1y: Optional[float]
    forecast_score_2y: Optional[float]
    forecast_score_3y: Optional[float]
    forecast_score_composite: Optional[float]   # = Forecast.forecast_score
    forecast_method: Optional[str]
    forecast_trend: Optional[str]
    confidence: Optional[float]
    history_length: Optional[int]

    class Config:
        from_attributes = True


class PaginatedSkills(BaseModel):
    items: List[SkillSummary]
    total: int
    page: int
    pages: int
    per_page: int


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedSkills)
async def list_skills(
    db: AsyncSession = Depends(get_db),
    q: Optional[str] = Query(None, description="Search skill name"),
    category: Optional[str] = Query(None),
    archetype: Optional[str] = Query(None),
    lifecycle: Optional[str] = Query(None),
    forecast_trend: Optional[str] = Query(None, description="Explosive | Growing | Stable | Declining"),
    forecast_method: Optional[str] = Query(None, description="Holt | ExponentialSmoothing | FeatureBased"),
    min_ses: Optional[float] = Query(None, ge=0, le=100),
    max_ses: Optional[float] = Query(None, ge=0, le=100),
    min_growth: Optional[float] = Query(None),
    sort_by: str = Query(
        "ses_score",
        enum=["ses_score", "name", "growth_rate", "linkedin_demand", "salary_premium", "forecast_score"],
    ),
    sort_dir: str = Query("desc", enum=["asc", "desc"]),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    stmt = (
        select(Skill)
        .outerjoin(SESScore,          Skill.id == SESScore.skill_id)
        .outerjoin(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
        .outerjoin(Forecast,          Skill.id == Forecast.skill_id)
        .options(
            selectinload(Skill.ses_score),
            selectinload(Skill.cluster),
            selectinload(Skill.forecast),
        )
    )

    filters = []
    if q:
        filters.append(Skill.name.ilike(f"%{q}%"))
    if category:
        filters.append(Skill.category == category)
    if lifecycle:
        filters.append(Skill.lifecycle == lifecycle)
    if archetype:
        filters.append(ClusterAssignment.archetype == archetype)
    if forecast_trend:
        filters.append(Forecast.forecast_trend == forecast_trend)
    if forecast_method:
        filters.append(Forecast.forecast_method == forecast_method)
    if min_ses is not None:
        filters.append(SESScore.ses_score >= min_ses)
    if max_ses is not None:
        filters.append(SESScore.ses_score <= max_ses)
    if min_growth is not None:
        filters.append(Skill.growth_rate >= min_growth)

    if filters:
        stmt = stmt.where(and_(*filters))

    sort_col = {
        "ses_score":       SESScore.ses_score,
        "name":            Skill.name,
        "growth_rate":     Skill.growth_rate,
        "linkedin_demand": Skill.linkedin_demand,
        "salary_premium":  Skill.salary_premium,
        "forecast_score":  Forecast.forecast_score,
    }[sort_by]

    stmt = stmt.order_by(
        sort_col.desc() if sort_dir == "desc" else sort_col.asc()
    )

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    offset = (page - 1) * per_page
    stmt = stmt.offset(offset).limit(per_page)
    result = (await db.execute(stmt)).scalars().unique().all()

    items = [
        SkillSummary(
            id=skill.id,
            name=skill.name,
            category=skill.category,
            lifecycle=skill.lifecycle,
            ses_score=skill.ses_score.ses_score if skill.ses_score else None,
            ses_tier=skill.ses_score.ses_tier if skill.ses_score else None,
            archetype=skill.cluster.archetype if skill.cluster else None,
            growth_rate=skill.growth_rate,
            linkedin_demand=skill.linkedin_demand,
            salary_premium=skill.salary_premium,
            forecast_1y=skill.forecast.forecast_1y if skill.forecast else None,
            forecast_trend=skill.forecast.forecast_trend if skill.forecast else None,
            forecast_method=skill.forecast.forecast_method if skill.forecast else None,
        )
        for skill in result
    ]

    return PaginatedSkills(
        items=items,
        total=total,
        page=page,
        pages=math.ceil(total / per_page),
        per_page=per_page,
    )


@router.get("/categories", response_model=List[str])
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Skill.category)
        .distinct()
        .where(Skill.category.isnot(None))
        .order_by(Skill.category)
    )
    return [r[0] for r in result.fetchall()]


@router.get("/archetypes/distribution")
async def archetype_distribution(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClusterAssignment.archetype, func.count().label("count"))
        .group_by(ClusterAssignment.archetype)
        .order_by(func.count().desc())
    )
    return [{"archetype": r[0], "count": r[1]} for r in result.fetchall()]


@router.get("/top-rising", response_model=List[SkillSummary])
async def top_rising(db: AsyncSession = Depends(get_db), limit: int = Query(10, le=50)):
    """Skills with highest CAGR and positive momentum — leading indicators of rising demand."""
    stmt = (
        select(Skill)
        .outerjoin(SESScore,          Skill.id == SESScore.skill_id)
        .outerjoin(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
        .outerjoin(Forecast,          Skill.id == Forecast.skill_id)
        .options(
            selectinload(Skill.ses_score),
            selectinload(Skill.cluster),
            selectinload(Skill.forecast),
        )
        .where(Skill.momentum_score > 0.5)
        .order_by(Skill.cagr.desc())
        .limit(limit)
    )
    result = (await db.execute(stmt)).scalars().unique().all()
    return [_to_summary(s) for s in result]


@router.get("/extinction-risk", response_model=List[SkillSummary])
async def extinction_risk(db: AsyncSession = Depends(get_db), limit: int = Query(10, le=50)):
    """Skills with lowest SES scores — highest obsolescence risk."""
    stmt = (
        select(Skill)
        .join(SESScore, Skill.id == SESScore.skill_id)
        .outerjoin(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
        .outerjoin(Forecast,          Skill.id == Forecast.skill_id)
        .options(
            selectinload(Skill.ses_score),
            selectinload(Skill.cluster),
            selectinload(Skill.forecast),
        )
        .order_by(SESScore.ses_score.asc())
        .limit(limit)
    )
    result = (await db.execute(stmt)).scalars().unique().all()
    return [_to_summary(s) for s in result]


@router.get("/{skill_id}", response_model=SkillDetail)
async def get_skill(skill_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Skill)
        .where(Skill.id == skill_id)
        .options(
            selectinload(Skill.ses_score),
            selectinload(Skill.cluster),
            selectinload(Skill.forecast),
            selectinload(Skill.history),
        )
    )
    skill = (await db.execute(stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(404, f"Skill '{skill_id}' not found")

    fc = skill.forecast

    return SkillDetail(
        id=skill.id,
        name=skill.name,
        category=skill.category,
        subcategory=skill.subcategory,
        lifecycle=skill.lifecycle,
        description=skill.description,
        linkedin_demand=skill.linkedin_demand,
        salary_premium=skill.salary_premium,
        current_usage=skill.current_usage,
        future_interest=skill.future_interest,
        global_adoption=skill.global_adoption,
        growth_rate=skill.growth_rate,
        momentum_score=skill.momentum_score,
        volatility_score=skill.volatility_score,
        growth_consistency=skill.growth_consistency,
        cagr=skill.cagr,
        trend_slope=skill.trend_slope,
        ses_score=skill.ses_score.ses_score if skill.ses_score else None,
        ses_tier=skill.ses_score.ses_tier if skill.ses_score else None,
        feature_score=skill.ses_score.feature_score if skill.ses_score else None,
        forecast_score=skill.ses_score.forecast_score if skill.ses_score else None,
        cluster_score=skill.ses_score.cluster_score if skill.ses_score else None,
        ses_delta_30d=skill.ses_score.ses_delta_30d if skill.ses_score else None,
        cluster_id=skill.cluster.cluster_id if skill.cluster else None,
        archetype=skill.cluster.archetype if skill.cluster else None,
        pca_x=skill.cluster.pca_x if skill.cluster else None,
        pca_y=skill.cluster.pca_y if skill.cluster else None,
        forecast_1y=fc.forecast_1y if fc else None,
        forecast_2y=fc.forecast_2y if fc else None,
        forecast_3y=fc.forecast_3y if fc else None,
        forecast_score_1y=fc.forecast_score_1y if fc else None,
        forecast_score_2y=fc.forecast_score_2y if fc else None,
        forecast_score_3y=fc.forecast_score_3y if fc else None,
        forecast_score_composite=fc.forecast_score if fc else None,
        forecast_method=fc.forecast_method if fc else None,
        forecast_trend=fc.forecast_trend if fc else None,
        confidence=fc.confidence if fc else None,
        history_length=fc.history_length if fc else None,
    )


@router.get("/{skill_id}/history")
async def get_skill_history(skill_id: str, db: AsyncSession = Depends(get_db)):
    from models.skill import SkillHistory
    from sqlalchemy import asc

    result = await db.execute(
        select(SkillHistory)
        .where(SkillHistory.skill_id == skill_id)
        .order_by(asc(SkillHistory.year))
    )
    rows = result.scalars().all()
    if not rows:
        raise HTTPException(404, f"No history for skill '{skill_id}'")
    return [
        {"year": r.year, "demand": r.demand, "adoption_rate": r.adoption_rate}
        for r in rows
    ]


@router.get("/{skill_id}/similar")
async def similar_skills(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = 6,
):
    """Skills in the same cluster, sorted by SES."""
    cluster_row = (
        await db.execute(
            select(ClusterAssignment).where(ClusterAssignment.skill_id == skill_id)
        )
    ).scalar_one_or_none()

    if not cluster_row:
        raise HTTPException(404, "Cluster data not found for this skill")

    stmt = (
        select(Skill)
        .join(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
        .join(SESScore, Skill.id == SESScore.skill_id)
        .options(selectinload(Skill.ses_score), selectinload(Skill.cluster))
        .where(ClusterAssignment.cluster_id == cluster_row.cluster_id)
        .where(Skill.id != skill_id)
        .order_by(SESScore.ses_score.desc())
        .limit(limit)
    )
    result = (await db.execute(stmt)).scalars().unique().all()
    return [
        {"id": s.id, "name": s.name, "ses_score": s.ses_score.ses_score if s.ses_score else None}
        for s in result
    ]


# ── Private helper ────────────────────────────────────────────────────────────

def _to_summary(skill: Skill) -> SkillSummary:
    return SkillSummary(
        id=skill.id,
        name=skill.name,
        category=skill.category,
        lifecycle=skill.lifecycle,
        ses_score=skill.ses_score.ses_score if skill.ses_score else None,
        ses_tier=skill.ses_score.ses_tier if skill.ses_score else None,
        archetype=skill.cluster.archetype if skill.cluster else None,
        growth_rate=skill.growth_rate,
        linkedin_demand=skill.linkedin_demand,
        salary_premium=skill.salary_premium,
        forecast_1y=skill.forecast.forecast_1y if skill.forecast else None,
        forecast_trend=skill.forecast.forecast_trend if skill.forecast else None,
        forecast_method=skill.forecast.forecast_method if skill.forecast else None,
    )
