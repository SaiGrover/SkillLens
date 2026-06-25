"""Generate the frontend's offline snapshot from canonical HSEP CSV artifacts.

The Vite app uses this snapshot when the API/database is unavailable. Keeping
it generated prevents the browser from silently showing a different dataset
than the backend pipeline.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

import pandas as pd

from data_quality import DATA, canonical_skill, display_skill


ROOT = Path(__file__).resolve().parents[2]
FRONTEND_FALLBACK = ROOT / "frontend/src/data/fallbackData.ts"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def csv_text(frame: pd.DataFrame) -> str:
    return frame.to_csv(index=False, lineterminator="\n")


def main() -> None:
    master = pd.read_csv(DATA / "canonical_skill_master.csv")
    ses = pd.read_csv(DATA / "ses_rankings.csv")
    clusters = pd.read_csv(DATA / "cluster_assignments.csv")
    forecasts = pd.read_csv(DATA / "forecast_results.csv")
    history = pd.read_csv(DATA / "canonical_skill_demand_history.csv")
    industry = pd.read_csv(DATA / "industry_analytics.csv")
    industry_map = pd.read_csv(DATA / "industry_skill_map.csv")

    skills = master.merge(ses, on=["skill", "sub_category", "linkedin_demand", "salary_premium", "current_usage", "future_interest", "global_adoption_score", "growth_rate"], how="left", suffixes=("", "_ses"))
    # SES already includes the fresh cluster coordinates, but the explicit
    # merge makes this generator robust when a future SES export is slimmed.
    skills = skills.merge(clusters, on="skill", how="left", suffixes=("", "_cluster"))
    skills = skills.merge(forecasts, on="skill", how="left", suffixes=("", "_forecast"))

    records = []
    for _, row in skills.iterrows():
        skill = str(row["skill"])
        records.append({
            "id": slug(skill),
            "name": display_skill(skill),
            "category": row.get("sub_category", "Unassigned"),
            "subcategory": row.get("sub_category", "Unassigned"),
            "lifecycle": "Observed",
            "description": f"{display_skill(skill)} is sourced from the canonical HSEP processed dataset.",
            "ses_score": float(row.get("ses_score", 0)),
            "ses_tier": row.get("ses_tier", "Unknown"),
            "archetype": row.get("archetype", row.get("archetype_cluster", "Unknown")),
            "growth_rate": float(row.get("growth_rate", 0)),
            "linkedin_demand": float(row.get("linkedin_demand", 0)),
            "salary_premium": float(row.get("salary_premium", 0)),
            "current_usage": float(row.get("current_usage", 0)),
            "future_interest": float(row.get("future_interest", 0)),
            "global_adoption": float(row.get("global_adoption_score", 0)),
            "momentum_score": float(row.get("growth_rate", 0)),
            "volatility_score": None,
            "growth_consistency": None,
            "cagr": float(row.get("growth_rate", 0)),
            "trend_slope": None,
            "feature_score": float(row.get("feature_score", 0)),
            "forecast_score": float(row.get("forecast_score", 0)),
            "cluster_score": float(row.get("cluster_score", 0)),
            "ses_delta_30d": 0,
            "cluster_id": int(row.get("cluster_id", 0)),
            "pca_x": float(row.get("pca_x", 0)),
            "pca_y": float(row.get("pca_y", 0)),
            "forecast_1y": float(row.get("forecast_1y", 0)),
            "forecast_2y": float(row.get("forecast_2y", 0)),
            "forecast_3y": float(row.get("forecast_3y", 0)),
            "forecast_score_1y": float(row.get("forecast_score_1y", 0)),
            "forecast_score_2y": float(row.get("forecast_score_2y", 0)),
            "forecast_score_3y": float(row.get("forecast_score_3y", 0)),
            "forecast_score_composite": float(row.get("forecast_score", 0)),
            "forecast_method": row.get("forecast_method", "FeatureBased"),
            "forecast_trend": row.get("forecast_trend", "Stable"),
            "confidence": float(row.get("confidence", 0)),
            "history_length": int(row.get("history_length", 0)),
        })

    histories = {
        slug(skill): group[["year", "demand", "adoption_rate"]].to_dict(orient="records")
        for skill, group in history.groupby("skill", sort=True)
    }
    by_industry = industry_map.copy()
    by_industry["skill"] = by_industry["skill"].astype(str).str.lower().str.strip()
    by_industry["skill"] = by_industry["skill"].map(lambda value: value.replace("cyber security", "cybersecurity"))
    industry_members: dict[str, list[str]] = {}
    industry_records = []
    for _, row in industry.iterrows():
        name = str(row["industry"])
        member_ids = [slug(canonical_skill(value)) for value in by_industry[by_industry["industry"] == name]["skill"].drop_duplicates().tolist()]
        member_ids = [skill_id for skill_id in member_ids if skill_id in {record["id"] for record in records}]
        industry_members[slug(name)] = member_ids
        top_skills = [
            record["name"] for record in sorted(
                (record for record in records if record["id"] in member_ids),
                key=lambda record: record["ses_score"], reverse=True,
            )[:5]
        ]
        avg_ses = float(row.get("avg_ses_score", 0))
        future = float(row.get("future_proof_pct", 0))
        growing = float(row.get("growing_pct", 0))
        stable = float(row.get("stable_pct", 0))
        high_risk = float(row.get("high_risk_pct", 0))
        industry_records.append({
            "id": slug(name),
            "name": name,
            "icon": None,
            "growth_rate": float(row.get("forecast_growth_3y_pct", 0)),
            "hiring_index": round(float(row.get("avg_linkedin_demand", 0)) * 100, 1),
            "avg_ses": avg_ses,
            "extinction_risk": high_risk,
            "forecast": row.get("forecast", "Stable"),
            "top_skills": top_skills[:5],
            "skill_count": int(row.get("skill_count", 0)),
            "archetype_distribution": {"Future-Proof": future, "Growing": growing, "Stable": stable, "High-Risk": high_risk},
        })

    source = FRONTEND_FALLBACK.read_text(encoding="utf-8")
    tail = source[source.index("const regions ="):source.index("export const csvSnapshotMetadata")]
    runtime = source[source.index("function byId"):]
    forecast_report = forecasts.assign(skill=forecasts["skill"].map(display_skill)).rename(columns={
        "forecast_1y": "forecast_demand_estimate_1y",
        "forecast_2y": "forecast_demand_estimate_2y",
        "forecast_3y": "forecast_demand_estimate_3y",
    })
    reports = {
        "skill-forecast": csv_text(forecast_report),
        "industry": csv_text(industry),
        "salary": csv_text(ses[["skill", "salary_premium", "linkedin_demand", "ses_score"]].assign(skill=lambda f: f["skill"].map(display_skill))),
        "automation": csv_text(ses[["skill", "ses_score", "ses_tier", "archetype", "forecast_trend", "growth_rate"]].assign(skill=lambda f: f["skill"].map(display_skill))),
        "global": "status\nRegional demand is unavailable: no regional source CSV is present in the HSEP processed dataset.\n",
        "career": "role,source,note\nCareer Advisor,canonical HSEP snapshot,Uses the canonical skill, forecast, SES, and industry artifacts.\n",
    }
    metadata = {
        "skill_count": len(records),
        "history_records": len(history),
        "forecast_records": len(forecasts),
        "industry_count": len(industry_records),
        "job_postings_processed": 123849,
        "source": "Canonical HSEP CSV snapshot from backend/data/processed",
    }
    output = (
        "// Auto-generated from canonical HSEP CSV outputs. Do not hand-edit.\n\n"
        f"const skills = {json.dumps(records, indent=2)}\n\n"
        f"const histories: Record<string, {{ year: number; demand: number; adoption_rate: number }}[]> = {json.dumps(histories, indent=2)}\n\n"
        f"const industries = {json.dumps(industry_records, indent=2)}\n"
        f"const industrySkillMembers: Record<string, string[]> = {json.dumps(industry_members, indent=2)}\n"
        f"{tail}"
        f"export const csvSnapshotMetadata = {json.dumps(metadata, indent=2)}\n"
        f"export const reportCsvById: Record<string, string> = {json.dumps(reports, indent=2)}\n\n"
        f"{runtime}"
    )
    FRONTEND_FALLBACK.write_text(output, encoding="utf-8")
    print(f"Frontend fallback written: {len(records)} skills, {len(history)} history rows")


if __name__ == "__main__":
    main()
