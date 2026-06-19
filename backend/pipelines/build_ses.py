"""
build_ses.py — SES Engine Pipeline
Updated to consume forecast_results.csv produced by 11_Hybrid_Forecasting.ipynb.

The ForecastScore is now read directly from the `forecast_score` column
(composite: 0.25×score_1y + 0.35×score_2y + 0.40×score_3y, already normalised
to [0,1] by MinMaxScaler inside build_forecasts.py).
No horizon selection or CI weighting needed.

Formula:  SES = 0.40×FeatureScore + 0.35×ForecastScore + 0.25×ClusterScore

Inputs:
    data/processed/master_skill_dataset_v8.csv
    data/processed/forecast_results.csv        ← hybrid forecasts
    data/processed/cluster_assignments.csv

Output:
    data/processed/ses_rankings.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("build_ses")

# ── Config ────────────────────────────────────────────────────────────────────
DATA         = Path("data/processed")
MASTER_CSV   = DATA / "master_skill_dataset_v8.csv"
FORECASTS_CSV = DATA / "forecast_results.csv"
CLUSTERS_CSV  = DATA / "cluster_assignments.csv"
OUTPUT_CSV    = DATA / "ses_rankings.csv"

# SES component weights
W_FEATURE  = 0.40
W_FORECAST = 0.35
W_CLUSTER  = 0.25

# Feature sub-weights (must sum to 1.0)
FEATURE_WEIGHTS = {
    "linkedin_demand":   0.25,
    "salary_premium":    0.20,
    "current_usage":     0.20,
    "future_interest":   0.15,
    "global_adoption":   0.10,
    "growth_rate":       0.10,
}
assert abs(sum(FEATURE_WEIGHTS.values()) - 1.0) < 1e-6

# Archetype → cluster score mapping
ARCHETYPE_SCORE = {
    "Future-Proof": 1.00,
    "Emerging":     0.85,
    "Stable":       0.65,
    "At-Risk":      0.35,
    "Obsolete":     0.10,
}

SES_TIERS = [
    (85, "Elite"),
    (70, "Future-Proof"),
    (50, "Stable"),
    (30, "At-Risk"),
    (0,  "Extinction Risk"),
]


def ses_tier(score: float) -> str:
    for threshold, label in SES_TIERS:
        if score >= threshold:
            return label
    return "Extinction Risk"


def minmax(series: pd.Series) -> pd.Series:
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (series - mn) / (mx - mn)


def main() -> None:
    logger.info("Loading pipeline artifacts…")
    master    = pd.read_csv(MASTER_CSV)
    forecasts = pd.read_csv(FORECASTS_CSV)
    clusters  = pd.read_csv(CLUSTERS_CSV)

    for df in [master, forecasts, clusters]:
        df["skill"] = df["skill"].astype(str).str.strip().str.lower()

    logger.info(f"Master: {len(master)} skills")
    logger.info(f"Forecasts: {len(forecasts)} skills")
    logger.info(f"Clusters: {len(clusters)} skills")

    # ── 1. Feature Score ─────────────────────────────────────────────────────
    logger.info("Computing Feature Score…")

    for col in FEATURE_WEIGHTS:
        if col in master.columns:
            master[f"_norm_{col}"] = minmax(master[col].fillna(0))
        else:
            logger.warning(f"  Feature column '{col}' not found — filling with 0")
            master[f"_norm_{col}"] = 0.0

    master["feature_score"] = sum(
        master[f"_norm_{col}"] * w
        for col, w in FEATURE_WEIGHTS.items()
    )

    # ── 2. Forecast Score ─────────────────────────────────────────────────────
    # forecast_results.csv already contains `forecast_score` normalised to [0,1]
    # by MinMaxScaler in build_forecasts.py. No further processing needed.
    logger.info("Merging Forecast Score from hybrid forecasts…")

    # Validate that the column exists
    if "forecast_score" not in forecasts.columns:
        raise ValueError(
            "forecast_results.csv is missing the 'forecast_score' column. "
            "Re-run build_forecasts.py (11_Hybrid_Forecasting.ipynb architecture)."
        )

    # Keep only the columns we need from forecasts
    forecast_cols = ["skill", "forecast_score", "forecast_method", "forecast_trend", "confidence"]
    forecast_subset = forecasts[[c for c in forecast_cols if c in forecasts.columns]].copy()

    master = master.merge(forecast_subset, on="skill", how="left")

    # Fallback: skills without a forecast row get feature_score as proxy
    n_missing_fc = master["forecast_score"].isna().sum()
    if n_missing_fc:
        logger.warning(
            f"  {n_missing_fc} skills have no forecast row — "
            "using feature_score as ForecastScore fallback."
        )
    master["forecast_score"] = master["forecast_score"].fillna(master["feature_score"])

    # ── 3. Cluster Score ──────────────────────────────────────────────────────
    logger.info("Computing Cluster Score…")
    clusters["cluster_score"] = clusters["archetype"].map(ARCHETYPE_SCORE).fillna(0.5)

    master = master.merge(
        clusters[["skill", "cluster_id", "archetype", "pca_x", "pca_y", "silhouette", "cluster_score"]],
        on="skill",
        how="left",
    )
    master["cluster_score"] = master["cluster_score"].fillna(0.5)

    # ── 4. Final SES ──────────────────────────────────────────────────────────
    logger.info("Computing SES = 0.40×Feature + 0.35×Forecast + 0.25×Cluster…")
    master["ses_score"] = (
        W_FEATURE  * master["feature_score"]
        + W_FORECAST * master["forecast_score"]
        + W_CLUSTER  * master["cluster_score"]
    ) * 100

    master["ses_score"] = master["ses_score"].round(2).clip(0, 100)
    master["ses_tier"]  = master["ses_score"].apply(ses_tier)

    # ── 5. SES delta (stub — computed by comparing to previous run) ───────────
    master["ses_delta_30d"] = 0.0

    # ── 6. Rank ───────────────────────────────────────────────────────────────
    master = master.sort_values("ses_score", ascending=False).reset_index(drop=True)
    master["ses_rank"] = master.index + 1

    # ── 7. Output ─────────────────────────────────────────────────────────────
    output_cols = [
        "skill", "ses_score", "ses_tier", "ses_rank", "ses_delta_30d",
        "feature_score", "forecast_score", "cluster_score",
        "cluster_id", "archetype", "pca_x", "pca_y", "silhouette",
        # Bonus metadata from forecasts — useful for dashboard display
        "forecast_method", "forecast_trend", "confidence",
    ]
    output = master[[c for c in output_cols if c in master.columns]]
    output.to_csv(OUTPUT_CSV, index=False)

    logger.info(f"\nSES pipeline complete → {OUTPUT_CSV}")
    logger.info(f"Skills ranked: {len(output)}")

    # Tier distribution
    logger.info("\nTier distribution:")
    for tier, count in output["ses_tier"].value_counts().items():
        pct = count / len(output) * 100
        logger.info(f"  {tier:<18} {count:>5}  ({pct:.1f}%)")

    # Method → avg SES
    if "forecast_method" in output.columns:
        logger.info("\nAvg SES by forecast method:")
        for method, grp in output.groupby("forecast_method"):
            logger.info(f"  {method:<25} avg_SES={grp['ses_score'].mean():.1f}")

    # Top 10
    logger.info("\nTop 10 Skills by SES:")
    for _, row in output.head(10).iterrows():
        method_tag = f"[{row.get('forecast_method', '?')}]" if "forecast_method" in output.columns else ""
        logger.info(
            f"  #{int(row['ses_rank']):3d}  {row['skill']:<28}  "
            f"SES={row['ses_score']:5.1f}  [{row['ses_tier']}]  {method_tag}"
        )


if __name__ == "__main__":
    main()
