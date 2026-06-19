"""
Global Demand router — regional skill demand analytics.
Data from Google Trends normalization (05_Global_Adoption_GoogleTrends.ipynb).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from core.database import get_db

router = APIRouter()

# In production these are computed in build_global_analytics.py
# and loaded from data/processed/global_analytics.csv.
# These realistic seeds power the frontend until the pipeline runs.

REGIONAL_DATA = [
    {
        "region": "North America",
        "demand_index": 96.2,
        "growth_index": 34.1,
        "risk_index": 12.4,
        "avg_salary_usd": 148000,
        "top_skills": ["LLM Engineering", "Kubernetes", "Rust", "Cybersecurity", "AWS"],
        "emerging_skills": ["RAG", "LangChain", "Prompt Engineering"],
        "job_postings_k": 412,
    },
    {
        "region": "Europe",
        "demand_index": 88.1,
        "growth_index": 27.8,
        "risk_index": 18.2,
        "avg_salary_usd": 108000,
        "top_skills": ["Cybersecurity", "Python", "TypeScript", "Go", "PostgreSQL"],
        "emerging_skills": ["MLOps", "Rust", "WebAssembly"],
        "job_postings_k": 298,
    },
    {
        "region": "India",
        "demand_index": 91.5,
        "growth_index": 41.3,
        "risk_index": 9.8,
        "avg_salary_usd": 28000,
        "top_skills": ["Python", "React", "AWS", "Java", "SQL"],
        "emerging_skills": ["LLM Engineering", "FastAPI", "Kubernetes"],
        "job_postings_k": 538,
    },
    {
        "region": "Asia Pacific",
        "demand_index": 89.7,
        "growth_index": 38.2,
        "risk_index": 11.6,
        "avg_salary_usd": 95000,
        "top_skills": ["Data Science", "Python", "AWS", "React", "Kubernetes"],
        "emerging_skills": ["Rust", "Go", "PyTorch"],
        "job_postings_k": 621,
    },
    {
        "region": "Middle East",
        "demand_index": 83.4,
        "growth_index": 51.7,
        "risk_index": 8.1,
        "avg_salary_usd": 112000,
        "top_skills": ["Cloud (AWS)", "Python", "Cybersecurity", "React", "SQL"],
        "emerging_skills": ["LLM Engineering", "Blockchain", "IoT"],
        "job_postings_k": 89,
    },
    {
        "region": "Latin America",
        "demand_index": 74.2,
        "growth_index": 29.4,
        "risk_index": 22.1,
        "avg_salary_usd": 52000,
        "top_skills": ["JavaScript", "Python", "React", "Node.js", "SQL"],
        "emerging_skills": ["TypeScript", "FastAPI", "Docker"],
        "job_postings_k": 143,
    },
    {
        "region": "Africa",
        "demand_index": 62.8,
        "growth_index": 44.2,
        "risk_index": 28.9,
        "avg_salary_usd": 38000,
        "top_skills": ["Python", "JavaScript", "SQL", "React", "Mobile Dev"],
        "emerging_skills": ["AWS", "Data Science", "Cybersecurity"],
        "job_postings_k": 67,
    },
]


class RegionData(BaseModel):
    region: str
    demand_index: float
    growth_index: float
    risk_index: float
    avg_salary_usd: int
    top_skills: List[str]
    emerging_skills: List[str]
    job_postings_k: int


@router.get("", response_model=List[RegionData])
async def global_demand():
    return REGIONAL_DATA


@router.get("/{region_name}")
async def region_detail(region_name: str):
    region = next(
        (r for r in REGIONAL_DATA if r["region"].lower().replace(" ", "-") == region_name.lower()),
        None
    )
    if not region:
        from fastapi import HTTPException
        raise HTTPException(404, f"Region '{region_name}' not found")
    return region


@router.get("/leaderboard/growth")
async def growth_leaderboard():
    """Regions ranked by growth index."""
    return sorted(REGIONAL_DATA, key=lambda x: x["growth_index"], reverse=True)
