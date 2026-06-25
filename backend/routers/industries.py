"""
Industries router — real per-industry analytics derived from pipeline outputs.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db
from models.skill import Skill, SESScore, ClusterAssignment, Industry

router = APIRouter()


class IndustrySummary(BaseModel):
    id: str
    name: str
    icon: Optional[str]
    growth_rate: Optional[float]
    hiring_index: Optional[float]
    avg_ses: Optional[float]
    extinction_risk: Optional[float]
    forecast: Optional[str]
    top_skills: Optional[list]
    skill_count: Optional[int]


class IndustryDetail(IndustrySummary):
    tier_distribution: dict
    archetype_distribution: dict


@router.get("", response_model=List[IndustrySummary])
async def list_industries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Industry).order_by(Industry.growth_rate.desc()))
    industries = result.scalars().all()
    return [
        IndustrySummary(
            id=ind.id, name=ind.name, icon=ind.icon,
            growth_rate=ind.growth_rate, hiring_index=ind.hiring_index,
            avg_ses=ind.avg_ses, extinction_risk=ind.extinction_risk,
            forecast=ind.forecast, top_skills=ind.top_skills,
            skill_count=ind.skill_count,
        )
        for ind in industries
    ]


@router.get("/{industry_id}", response_model=IndustrySummary)
async def get_industry(industry_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Industry).where(Industry.id == industry_id))
    ind = result.scalar_one_or_none()
    if not ind:
        raise HTTPException(404, f"Industry '{industry_id}' not found")
    return IndustrySummary(
        id=ind.id, name=ind.name, icon=ind.icon,
        growth_rate=ind.growth_rate, hiring_index=ind.hiring_index,
        avg_ses=ind.avg_ses, extinction_risk=ind.extinction_risk,
        forecast=ind.forecast, top_skills=ind.top_skills,
        skill_count=ind.skill_count,
    )


@router.get("/{industry_id}/skills")
async def industry_top_skills(
    industry_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(15, le=50),
):
    """Top skills by SES within the industry's skill list."""
    result = await db.execute(select(Industry).where(Industry.id == industry_id))
    ind = result.scalar_one_or_none()
    if not ind or not ind.top_skills:
        raise HTTPException(404, "Industry not found or has no skill data")

    skill_ids = [s.lower().replace(" ", "-") for s in (ind.top_skills or [])]
    stmt = (
        select(Skill)
        .join(SESScore, Skill.id == SESScore.skill_id)
        .where(Skill.id.in_(skill_ids))
        .options(selectinload(Skill.ses_score), selectinload(Skill.cluster), selectinload(Skill.forecast))
        .order_by(SESScore.ses_score.desc())
        .limit(limit)
    )
    skills = (await db.execute(stmt)).scalars().unique().all()
    return [
        {
            "id": s.id, "name": s.name,
            "ses_score": s.ses_score.ses_score if s.ses_score else None,
            "ses_tier": s.ses_score.ses_tier if s.ses_score else None,
            "archetype": s.cluster.archetype if s.cluster else None,
            "linkedin_demand": s.linkedin_demand,
            "forecast_trend": s.forecast.forecast_trend if s.forecast else None,
            "salary_premium": s.salary_premium,
        }
        for s in skills
    ]
