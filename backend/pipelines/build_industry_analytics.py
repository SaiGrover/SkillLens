"""Aggregate canonical skill intelligence into the eight HSEP industries."""

from pathlib import Path

import pandas as pd

from data_quality import canonical_skill


DATA = Path("data/processed")
SES_CSV = DATA / "ses_rankings.csv"
FORECASTS_CSV = DATA / "forecast_results.csv"
MAP_CSV = DATA / "industry_skill_map.csv"
OUTPUT_CSV = DATA / "industry_analytics.csv"


def industry_trend(growth_pct: float) -> str:
    if growth_pct >= 12.5:
        return "Strong Growth"
    if growth_pct >= 11:
        return "Growing"
    if growth_pct >= 8:
        return "Steady"
    if growth_pct >= 0:
        return "Stable"
    return "Contracting"


def main() -> None:
    ses = pd.read_csv(SES_CSV)
    forecasts = pd.read_csv(FORECASTS_CSV)
    mapping = pd.read_csv(MAP_CSV)
    for frame in (ses, forecasts, mapping):
        frame["skill"] = frame["skill"].map(canonical_skill)
    mapping = mapping[["industry", "skill"]].drop_duplicates()
    joined = mapping.merge(ses, on="skill", how="inner").merge(
        forecasts[["skill", "forecast_1y", "forecast_3y", "forecast_trend"]], on="skill", how="left", suffixes=("", "_forecast"),
    )

    rows = []
    for industry, group in joined.groupby("industry", sort=True):
        growth = ((group["forecast_3y"] / group["forecast_1y"] - 1) * 100).replace([float("inf"), -float("inf")], 0)
        top = group.sort_values("ses_score", ascending=False).iloc[0]
        archetypes = group["archetype"].value_counts(normalize=True)
        average_growth = float(growth.mean())
        rows.append({
            "industry": industry,
            "skill_count": int(group["skill"].nunique()),
            "avg_ses_score": round(float(group["ses_score"].mean()), 4),
            "avg_linkedin_demand": round(float(group["linkedin_demand"].mean()), 4),
            "avg_salary_premium": round(float(group["salary_premium"].mean()), 4),
            "avg_growth_rate": round(float(group["growth_rate"].mean()), 4),
            "avg_future_interest": round(float(group["future_interest"].mean()), 4),
            "avg_global_adoption": round(float(group["global_adoption_score"].mean()), 4),
            "avg_forecast_1y": round(float(group["forecast_1y"].mean()), 2),
            "avg_forecast_3y": round(float(group["forecast_3y"].mean()), 2),
            "forecast_growth_3y_pct": round(average_growth, 2),
            "forecast": industry_trend(average_growth),
            "pct_skills_growing": round(float(group["forecast_trend"].isin(["Growing", "Explosive"]).mean() * 100), 1),
            "pct_skills_declining": round(float((group["forecast_trend"] == "Declining").mean() * 100), 1),
            "top_skill": top["skill"],
            "top_ses_tier": top["ses_tier"],
            "very_safe_count": int((group["ses_tier"] == "Very Safe").sum()),
            "safe_count": int((group["ses_tier"] == "Safe").sum()),
            "moderate_count": int((group["ses_tier"] == "Moderate").sum()),
            "risky_count": int((group["ses_tier"] == "Risky").sum()),
            "future_proof_pct": round(float(archetypes.get("Future-Proof", 0) * 100), 1),
            "growing_pct": round(float(archetypes.get("Growing", 0) * 100), 1),
            "stable_pct": round(float(archetypes.get("Stable", 0) * 100), 1),
            "high_risk_pct": round(float(archetypes.get("High-Risk", 0) * 100), 1),
        })
    pd.DataFrame(rows).to_csv(OUTPUT_CSV, index=False)
    print(f"Industry analytics written: {len(rows)} industries")


if __name__ == "__main__":
    main()
