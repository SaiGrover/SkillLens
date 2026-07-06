"""
Industries router — real per-industry analytics derived from pipeline outputs.
"""

import csv
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db
from models.skill import Skill, SESScore, ClusterAssignment, Industry

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"


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


def _slug(value: str) -> str:
    return value.lower().strip().replace(" ", "-").replace("/", "-")


@lru_cache(maxsize=1)
def industry_skill_evidence() -> dict[str, dict[str, dict]]:
    path = DATA_DIR / "industry_skill_map.csv"
    if not path.exists():
        return {}

    evidence: dict[str, dict[str, dict]] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            industry = (row.get("industry") or "").strip()
            skill = (row.get("skill") or "").strip()
            if not industry or not skill:
                continue

            def number(field: str) -> Optional[float]:
                try:
                    return float(row[field]) if row.get(field) else None
                except ValueError:
                    return None

            evidence.setdefault(_slug(industry), {})[_slug(skill)] = {
                "ses_score": number("ses_score"),
                "ses_tier": row.get("ses_tier") or None,
                "archetype": row.get("archetype") or None,
                "forecast_1y": number("forecast_1y"),
                "forecast_3y": number("forecast_3y"),
                "forecast_trend": row.get("forecast_trend") or None,
            }
    return evidence


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
    evidence_for_industry = industry_skill_evidence().get(industry_id, {})
    rows = []
    for s in skills:
        evidence = evidence_for_industry.get(s.id, {})
        global_archetype = s.cluster.archetype if s.cluster else None
        evidence_archetype = evidence.get("archetype")
        use_industry_archetype = (
            evidence_archetype
            and ((global_archetype or "").lower() == "high-risk")
            and evidence_archetype.lower() != "high-risk"
        )
        use_industry_score = use_industry_archetype and evidence.get("ses_score") is not None
        rows.append({
            "id": s.id, "name": s.name,
            "ses_score": evidence.get("ses_score") if use_industry_score else (s.ses_score.ses_score if s.ses_score else None),
            "ses_tier": evidence.get("ses_tier") if use_industry_score else (s.ses_score.ses_tier if s.ses_score else None),
            "archetype": evidence_archetype if use_industry_archetype else global_archetype,
            "linkedin_demand": s.linkedin_demand,
            "current_usage": s.current_usage,
            "future_interest": s.future_interest,
            "growth_rate": s.growth_rate,
            "forecast_score": s.forecast.forecast_score if s.forecast else None,
            "forecast_score_composite": s.forecast.forecast_score if s.forecast else None,
            "forecast_trend": evidence.get("forecast_trend") or (s.forecast.forecast_trend if s.forecast else None),
            "forecast_1y": evidence.get("forecast_1y") if evidence.get("forecast_1y") is not None else (s.forecast.forecast_1y if s.forecast else None),
            "forecast_3y": evidence.get("forecast_3y") if evidence.get("forecast_3y") is not None else (s.forecast.forecast_3y if s.forecast else None),
            "global_archetype": global_archetype,
            "salary_premium": s.salary_premium,
        })
    return rows
