"""Compute a consistent normalized Skill Extinction Score (SES).

Scores are stored on a 0-1 scale and displayed as 0-100 in the product.
That keeps the feature, forecast, and SES contracts consistent.
"""

from pathlib import Path

import pandas as pd

from data_quality import MASTER_CSV, build_canonical_inputs


DATA = Path("data/processed")
FORECASTS_CSV = DATA / "forecast_results.csv"
CLUSTERS_CSV = DATA / "cluster_assignments.csv"
OUTPUT_CSV = DATA / "ses_rankings.csv"
FEATURE_WEIGHTS = {
    "linkedin_demand": 0.25,
    "salary_premium": 0.20,
    "current_usage": 0.20,
    "future_interest": 0.15,
    "global_adoption_score": 0.10,
    "growth_rate": 0.10,
}
ARCHETYPE_SCORE = {"Future-Proof": 1.0, "Growing": 0.75, "Stable": 0.55, "High-Risk": 0.25}


def tier(score: float) -> str:
    if score >= 0.70:
        return "Very Safe"
    if score >= 0.45:
        return "Safe"
    if score >= 0.30:
        return "Moderate"
    return "Risky"


def main() -> None:
    build_canonical_inputs()
    master = pd.read_csv(MASTER_CSV)
    forecasts = pd.read_csv(FORECASTS_CSV)
    clusters = pd.read_csv(CLUSTERS_CSV)
    for frame in (master, forecasts, clusters):
        frame["skill"] = frame["skill"].astype(str).str.strip().str.lower()

    master["feature_score"] = sum(master[column].fillna(0) * weight for column, weight in FEATURE_WEIGHTS.items())
    result = master.merge(
        forecasts[["skill", "forecast_1y", "forecast_2y", "forecast_3y", "forecast_score", "forecast_method", "forecast_trend", "confidence", "history_length"]],
        on="skill", how="left",
    ).merge(
        clusters[["skill", "cluster_id", "archetype", "pca_x", "pca_y", "silhouette"]],
        on="skill", how="left",
    )
    result["forecast_score"] = result["forecast_score"].fillna(result["feature_score"])
    result["cluster_score"] = result["archetype"].map(ARCHETYPE_SCORE).fillna(0.5)
    result["ses_score"] = (
        0.40 * result["feature_score"]
        + 0.35 * result["forecast_score"]
        + 0.25 * result["cluster_score"]
    ).clip(0, 1)
    result["ses_tier"] = result["ses_score"].map(tier)
    result["ses_delta_30d"] = 0.0
    result = result.sort_values("ses_score", ascending=False).reset_index(drop=True)
    result.insert(0, "ses_rank", result.index + 1)
    output_columns = [
        "ses_rank", "skill", "sub_category", "ses_score", "ses_tier", "feature_score",
        "forecast_score", "cluster_score", "archetype", "cluster_id", "pca_x", "pca_y",
        "silhouette", *FEATURE_WEIGHTS.keys(), "forecast_1y", "forecast_2y", "forecast_3y",
        "forecast_method", "forecast_trend", "confidence", "history_length", "ses_delta_30d",
    ]
    result[output_columns].to_csv(OUTPUT_CSV, index=False)
    print(f"SES written: {len(result)} skills; range={result.ses_score.min():.3f}-{result.ses_score.max():.3f}")


if __name__ == "__main__":
    main()
