"""
Clustering router — exposes PCA coordinates, archetype memberships,
silhouette scores, and representative skills per cluster.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db
from models.skill import Skill, ClusterAssignment, SESScore

router = APIRouter()


class ClusterPoint(BaseModel):
    skill_id: str
    skill_name: str
    cluster_id: int
    archetype: str
    pca_x: float
    pca_y: float
    silhouette: Optional[float]
    ses_score: Optional[float]
    category: Optional[str]


class ClusterSummary(BaseModel):
    cluster_id: int
    archetype: str
    count: int
    avg_ses: float
    avg_silhouette: float
    centroid_x: float
    centroid_y: float
    representative_skills: List[str]
    description: str


ARCHETYPE_DESCRIPTIONS = {
    "Future-Proof": (
        "High demand, growing adoption, strong salary premium, and positive forecasts. "
        "These skills are essential infrastructure for the next 3–5 years."
    ),
    "Emerging": (
        "Recent entrants with explosive growth rates. Lower current adoption but "
        "strong forward momentum. Early investment here yields high career ROI."
    ),
    "Stable": (
        "Consistent, moderate demand with low volatility. Foundational skills that "
        "remain relevant without dramatic growth or decline."
    ),
    "At-Risk": (
        "Declining adoption rates and weakening job market signal. Skills in this "
        "cluster should be supplemented with Future-Proof counterparts."
    ),
    "Obsolete": (
        "Very low current demand, negative growth, and weak forecasts. These skills "
        "are being phased out of active job requirements."
    ),
}


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/map", response_model=List[ClusterPoint])
async def cluster_map(
    db: AsyncSession = Depends(get_db),
    archetype: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(500, le=3000),
):
    """
    Returns all skills with their PCA (x, y) coordinates for the cluster scatter plot.
    Optionally filter by archetype or category.
    """
    stmt = (
        select(Skill, ClusterAssignment, SESScore)
        .join(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
        .outerjoin(SESScore, Skill.id == SESScore.skill_id)
    )
    if archetype:
        stmt = stmt.where(ClusterAssignment.archetype == archetype)
    if category:
        stmt = stmt.where(Skill.category == category)

    stmt = stmt.order_by(SESScore.ses_score.desc().nullslast()).limit(limit)
    rows = (await db.execute(stmt)).all()

    return [
        ClusterPoint(
            skill_id=skill.id,
            skill_name=skill.name,
            cluster_id=cluster.cluster_id,
            archetype=cluster.archetype,
            pca_x=round(cluster.pca_x or 0, 4),
            pca_y=round(cluster.pca_y or 0, 4),
            silhouette=cluster.silhouette,
            ses_score=ses.ses_score if ses else None,
            category=skill.category,
        )
        for skill, cluster, ses in rows
    ]


@router.get("/summary", response_model=List[ClusterSummary])
async def cluster_summary(db: AsyncSession = Depends(get_db)):
    """
    Aggregated per-cluster stats: count, avg SES, centroid PCA, representative skills.
    """
    agg_stmt = (
        select(
            ClusterAssignment.cluster_id,
            ClusterAssignment.archetype,
            func.count().label("count"),
            func.avg(SESScore.ses_score).label("avg_ses"),
            func.avg(ClusterAssignment.silhouette).label("avg_silhouette"),
            func.avg(ClusterAssignment.pca_x).label("centroid_x"),
            func.avg(ClusterAssignment.pca_y).label("centroid_y"),
        )
        .outerjoin(SESScore, ClusterAssignment.skill_id == SESScore.skill_id)
        .group_by(ClusterAssignment.cluster_id, ClusterAssignment.archetype)
        .order_by(ClusterAssignment.cluster_id)
    )
    agg_rows = (await db.execute(agg_stmt)).all()

    summaries = []
    for row in agg_rows:
        cluster_id, archetype, count, avg_ses, avg_sil, cx, cy = row

        # Top 5 representative skills (highest SES in cluster)
        rep_stmt = (
            select(Skill.name)
            .join(ClusterAssignment, Skill.id == ClusterAssignment.skill_id)
            .join(SESScore, Skill.id == SESScore.skill_id)
            .where(ClusterAssignment.cluster_id == cluster_id)
            .order_by(SESScore.ses_score.desc())
            .limit(5)
        )
        rep_names = [r[0] for r in (await db.execute(rep_stmt)).fetchall()]

        summaries.append(ClusterSummary(
            cluster_id=cluster_id,
            archetype=archetype or "Unknown",
            count=count,
            avg_ses=round(avg_ses or 0, 2),
            avg_silhouette=round(avg_sil or 0, 3),
            centroid_x=round(cx or 0, 4),
            centroid_y=round(cy or 0, 4),
            representative_skills=rep_names,
            description=ARCHETYPE_DESCRIPTIONS.get(archetype or "", ""),
        ))

    return summaries


@router.get("/silhouette")
async def silhouette_score(db: AsyncSession = Depends(get_db)):
    """Global average silhouette score across all clusters."""
    result = await db.execute(
        select(func.avg(ClusterAssignment.silhouette))
    )
    avg_sil = result.scalar()
    return {
        "global_silhouette": round(avg_sil or 0, 4),
        "interpretation": (
            "Excellent (>0.7)" if (avg_sil or 0) > 0.7
            else "Good (0.5–0.7)" if (avg_sil or 0) > 0.5
            else "Fair (0.25–0.5)"
        ),
    }
