"""
Career Intelligence router.
Skill Gap Analysis: current_role → target_role
Roadmap: sorted by ROI = (ses_score × forecast_growth × salary_premium)

Forecast growth updated to use forecast_1y / forecast_3y from the hybrid
one-row-per-skill Forecast table (11_Hybrid_Forecasting.ipynb schema).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional, Dict

from core.database import get_db
from models.skill import Skill, SESScore, Forecast, ClusterAssignment

router = APIRouter()


# ── Role-to-skill taxonomy ────────────────────────────────────────────────────

ROLE_SKILLS: Dict[str, List[str]] = {
    "junior-backend-dev": [
        "python", "sql", "fastapi", "postgresql", "git", "docker", "rest-api",
    ],
    "senior-backend-dev": [
        "python", "sql", "fastapi", "postgresql", "redis", "docker", "kubernetes",
        "system-design", "microservices", "grpc", "monitoring",
    ],
    "ml-engineer": [
        "python", "pytorch", "scikit-learn", "mlflow", "sql", "statistics",
        "feature-engineering", "apache-spark", "docker", "kubernetes",
    ],
    "data-scientist": [
        "python", "pandas", "numpy", "sql", "scikit-learn", "statistics",
        "tableau", "apache-spark", "r", "deep-learning",
    ],
    "frontend-dev": [
        "javascript", "typescript", "react", "nextjs", "css", "tailwindcss",
        "git", "webpack", "accessibility",
    ],
    "fullstack-dev": [
        "javascript", "typescript", "react", "nextjs", "python", "fastapi",
        "postgresql", "docker", "git", "css",
    ],
    "devops-engineer": [
        "docker", "kubernetes", "terraform", "aws", "ci-cd", "bash",
        "prometheus", "grafana", "ansible", "python",
    ],
    "cloud-architect": [
        "aws", "azure", "gcp", "kubernetes", "terraform", "microservices",
        "system-design", "cost-optimization", "iam", "networking",
    ],
    "llm-engineer": [
        "python", "langchain", "rag", "pytorch", "fastapi", "vector-databases",
        "prompt-engineering", "openai-api", "fine-tuning", "mlflow",
    ],
    "cybersecurity-analyst": [
        "networking", "siem", "python", "bash", "zero-trust", "sast", "dast",
        "cloud-security", "incident-response", "cryptography",
    ],
}

SKILL_DIFFICULTY: Dict[str, str] = {
    "kubernetes": "advanced", "system-design": "advanced", "pytorch": "advanced",
    "apache-spark": "advanced", "grpc": "advanced", "statistics": "intermediate",
    "microservices": "intermediate", "fastapi": "intermediate", "mlflow": "intermediate",
    "docker": "intermediate", "rag": "intermediate", "langchain": "intermediate",
    "vector-databases": "intermediate", "prometheus": "intermediate",
    "python": "beginner", "sql": "beginner", "git": "beginner",
    "react": "intermediate", "typescript": "intermediate", "terraform": "intermediate",
}

DIFFICULTY_HOURS = {
    "beginner":     40,
    "intermediate": 100,
    "advanced":     200,
}


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class RoadmapStep(BaseModel):
    skill_id: str
    skill_name: str
    priority: int
    ses_score: Optional[float]
    ses_tier: Optional[str]
    forecast_growth_pct: Optional[float]   # (forecast_3y - forecast_1y) / forecast_1y × 100
    forecast_trend: Optional[str]
    forecast_method: Optional[str]
    salary_premium: Optional[float]
    estimated_weeks: int
    difficulty: str
    roi_score: float
    archetype: Optional[str]


class GapAnalysisResponse(BaseModel):
    current_role: str
    target_role: str
    current_skills: List[str]
    missing_skills: List[str]
    already_have: List[str]
    roadmap: List[RoadmapStep]
    total_weeks: int
    avg_ses_improvement: float
    target_role_stability: Optional[float]
    summary: str


class RoleStabilityResponse(BaseModel):
    role: str
    stability_score: float
    avg_ses: float
    at_risk_skills: List[str]
    future_proof_skills: List[str]
    explosive_skills: List[str]   # Explosive forecast trend — high-signal additions
    recommendation: str


# ── Helpers ──────────────────────────────────────────────────────────────────

async def fetch_skill_data(skill_ids: List[str], db: AsyncSession) -> Dict[str, Skill]:
    stmt = (
        select(Skill)
        .where(Skill.id.in_(skill_ids))
        .options(
            selectinload(Skill.ses_score),
            selectinload(Skill.forecast),
            selectinload(Skill.cluster),
        )
    )
    skills = (await db.execute(stmt)).scalars().unique().all()
    return {s.id: s for s in skills}


def _forecast_growth_pct(fc: Optional[Forecast]) -> float:
    """
    Growth % from 1-year to 3-year forecast.
    Uses the hybrid forecast columns: forecast_1y and forecast_3y.
    """
    if fc is None or fc.forecast_1y is None or fc.forecast_3y is None:
        return 0.0
    base = max(abs(fc.forecast_1y), 1.0)
    return (fc.forecast_3y - fc.forecast_1y) / base * 100


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/roles", response_model=List[str])
async def available_roles():
    return sorted(ROLE_SKILLS.keys())


@router.get("/role/{role_id}/skills")
async def role_required_skills(role_id: str):
    skills = ROLE_SKILLS.get(role_id)
    if not skills:
        raise HTTPException(404, f"Role '{role_id}' not found")
    return {"role": role_id, "required_skills": skills}


@router.post("/gap-analysis", response_model=GapAnalysisResponse)
async def gap_analysis(
    current_role: str,
    target_role: str,
    db: AsyncSession = Depends(get_db),
    current_skills_override: Optional[str] = Query(
        None, description="Comma-separated skill IDs to override current role skills"
    ),
):
    current_set = set(ROLE_SKILLS.get(current_role, []))
    if current_skills_override:
        current_set = {s.strip() for s in current_skills_override.split(",")}

    target_set = set(ROLE_SKILLS.get(target_role, []))
    if not target_set:
        raise HTTPException(404, f"Target role '{target_role}' not found")

    missing = sorted(target_set - current_set)
    already = sorted(target_set & current_set)

    skill_data = await fetch_skill_data(missing, db)

    roadmap_steps: List[RoadmapStep] = []
    for skill_id in missing:
        sk = skill_data.get(skill_id)
        ses_score  = sk.ses_score.ses_score if sk and sk.ses_score else 50.0
        ses_tier   = sk.ses_score.ses_tier  if sk and sk.ses_score else "Stable"
        archetype  = sk.cluster.archetype   if sk and sk.cluster   else "Stable"
        salary_prem = sk.salary_premium     if sk else 0.5

        fc = sk.forecast if sk else None
        growth_pct    = _forecast_growth_pct(fc)
        forecast_trend  = fc.forecast_trend  if fc else None
        forecast_method = fc.forecast_method if fc else None

        difficulty = SKILL_DIFFICULTY.get(skill_id, "intermediate")
        weeks = DIFFICULTY_HOURS[difficulty] // 40

        # ROI = weighted combination of SES, forecast growth, and salary signal
        roi = (ses_score / 100) * 0.5 + (max(growth_pct, 0) / 100) * 0.3 + salary_prem * 0.2

        roadmap_steps.append(RoadmapStep(
            skill_id=skill_id,
            skill_name=sk.name if sk else skill_id.replace("-", " ").title(),
            priority=0,
            ses_score=round(ses_score, 2),
            ses_tier=ses_tier,
            forecast_growth_pct=round(growth_pct, 1),
            forecast_trend=forecast_trend,
            forecast_method=forecast_method,
            salary_premium=round(salary_prem, 3),
            estimated_weeks=weeks,
            difficulty=difficulty,
            roi_score=round(roi, 4),
            archetype=archetype,
        ))

    roadmap_steps.sort(key=lambda x: x.roi_score, reverse=True)
    for idx, step in enumerate(roadmap_steps):
        step.priority = idx + 1

    total_weeks = sum(s.estimated_weeks for s in roadmap_steps)
    avg_ses_improvement = (
        sum(s.ses_score or 0 for s in roadmap_steps) / len(roadmap_steps)
        if roadmap_steps else 0.0
    )

    target_skill_data = await fetch_skill_data(list(target_set), db)
    target_ses = [
        sk.ses_score.ses_score
        for sk in target_skill_data.values()
        if sk and sk.ses_score
    ]
    target_stability = sum(target_ses) / len(target_ses) if target_ses else None

    summary = (
        f"To move from {current_role.replace('-', ' ').title()} to "
        f"{target_role.replace('-', ' ').title()}, you need {len(missing)} new skills. "
        f"Estimated timeline: {total_weeks} weeks. "
        f"Average SES of gap skills: {round(avg_ses_improvement, 1)}. "
        f"Target role stability: {round(target_stability, 1) if target_stability else 'N/A'}."
    )

    return GapAnalysisResponse(
        current_role=current_role,
        target_role=target_role,
        current_skills=sorted(current_set),
        missing_skills=missing,
        already_have=already,
        roadmap=roadmap_steps,
        total_weeks=total_weeks,
        avg_ses_improvement=round(avg_ses_improvement, 2),
        target_role_stability=round(target_stability, 2) if target_stability else None,
        summary=summary,
    )


@router.get("/stability/{role_id}", response_model=RoleStabilityResponse)
async def role_stability(role_id: str, db: AsyncSession = Depends(get_db)):
    skills = ROLE_SKILLS.get(role_id)
    if not skills:
        raise HTTPException(404, f"Role '{role_id}' not found")

    skill_data = await fetch_skill_data(skills, db)
    ses_scores: List[float] = []
    at_risk, future_proof, explosive = [], [], []

    for sid in skills:
        sk = skill_data.get(sid)
        if sk and sk.ses_score:
            score = sk.ses_score.ses_score
            ses_scores.append(score)
            if score < 40:
                at_risk.append(sk.name)
            elif score >= 70:
                future_proof.append(sk.name)
        if sk and sk.forecast and sk.forecast.forecast_trend == "Explosive":
            explosive.append(sk.name)

    avg_ses = sum(ses_scores) / len(ses_scores) if ses_scores else 0.0

    if avg_ses >= 70:
        rec = "This role has strong long-term stability. Deepen expertise in Future-Proof skills."
    elif avg_ses >= 50:
        rec = "Stable but should supplement with Emerging/Explosive skills to stay ahead."
    else:
        rec = "High automation risk. Transition planning with Future-Proof skills is advised."

    return RoleStabilityResponse(
        role=role_id,
        stability_score=round(avg_ses, 2),
        avg_ses=round(avg_ses, 2),
        at_risk_skills=at_risk,
        future_proof_skills=future_proof,
        explosive_skills=explosive,
        recommendation=rec,
    )
