"""
build_forecasts.py — Hybrid Forecasting Pipeline
Based on 11_Hybrid_Forecasting.ipynb

Tiered strategy by history length:
  ≥ 10 years  →  Holt's Trend Forecasting (damped)
  7–9  years  →  Exponential Smoothing (additive trend)
  < 7  years  →  Feature-Based Projection

Horizons: 1-year, 2-year, 3-year ahead (mapped to 12/24/36 months for API).

Inputs:
    data/processed/skill_demand_history_clean.csv
    data/processed/expanded_skill_master.csv   (must contain feature columns)

Output:
    data/processed/forecast_results.csv
"""

import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.holtwinters import Holt, ExponentialSmoothing
import logging

from data_quality import HISTORY_CSV, MASTER_CSV, build_canonical_inputs

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("build_forecasts")

# ── Config ────────────────────────────────────────────────────────────────────
DATA          = Path("data/processed")
SKILLS_CSV    = MASTER_CSV
OUTPUT_CSV    = DATA / "forecast_results.csv"

HORIZONS = [1, 2, 3]   # years ahead

# Feature-based projection weights
FEATURE_COLS = [
    "linkedin_demand",
    "future_interest",
    "growth_rate",
    "current_usage",
    "global_adoption_score",
]
WEIGHTS = [0.30, 0.25, 0.25, 0.10, 0.10]

# Thresholds matching the notebook
HOLT_MIN_YEARS  = 10
EXP_MIN_YEARS   = 7


# ── Forecasting functions ─────────────────────────────────────────────────────

def holt_forecast(skill_name: str, history: pd.DataFrame) -> tuple[float, float, float]:
    """
    Holt's damped trend model for skills with ≥10 years of history.
    Uses raw demand counts as the series.
    """
    df = history[history["skill"] == skill_name].sort_values("year")
    y = df["demand"].astype(float).values

    model = Holt(y, damped_trend=True, initialization_method="estimated")
    fit = model.fit(optimized=True)
    preds = fit.forecast(len(HORIZONS))
    preds = np.clip(preds, 0, None)

    return float(preds[0]), float(preds[1]), float(preds[2])


def exp_smoothing_forecast(skill_name: str, history: pd.DataFrame) -> tuple[float, float, float]:
    """
    Exponential Smoothing with additive trend for skills with 7–9 years of history.
    """
    df = history[history["skill"] == skill_name].sort_values("year")
    y = df["demand"].astype(float).values

    model = ExponentialSmoothing(y, trend="add", seasonal=None)
    fit = model.fit(optimized=True)
    preds = fit.forecast(len(HORIZONS))
    preds = np.clip(preds, 0, None)

    return float(preds[0]), float(preds[1]), float(preds[2])


def feature_based_forecast(
    row: pd.Series,
    latest_demand: pd.Series,
) -> tuple[float, float, float]:
    """
    Feature-weighted compound growth projection for skills with <7 years of history.
    annual_growth = growth_index × 0.15 (capped at 15% per year)
    """
    sk = row["skill"]

    base = float(latest_demand[sk]) if sk in latest_demand.index else float(latest_demand.median())

    growth_idx = sum(
        w * row[f]
        for w, f in zip(WEIGHTS, FEATURE_COLS)
        if f in row and not pd.isna(row[f])
    )
    growth_idx = min(growth_idx, 1.0)
    annual_growth = growth_idx * 0.15

    preds = [base * ((1 + annual_growth) ** h) for h in HORIZONS]

    return float(preds[0]), float(preds[1]), float(preds[2])


# ── Post-processing helpers ───────────────────────────────────────────────────

def compute_forecast_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalise raw forecasts to [0,1] scores and compute the weighted composite
    forecast_score used by the SES engine.

    Weights:  1y=0.25,  2y=0.35,  3y=0.40  (more weight on longer horizon).
    """
    sc = MinMaxScaler()

    df["forecast_score_1y"] = sc.fit_transform(df[["forecast_1y"]])
    df["forecast_score_2y"] = sc.fit_transform(df[["forecast_2y"]])
    df["forecast_score_3y"] = sc.fit_transform(df[["forecast_3y"]])

    df["forecast_score"] = (
        0.25 * df["forecast_score_1y"]
        + 0.35 * df["forecast_score_2y"]
        + 0.40 * df["forecast_score_3y"]
    )

    return df


def assign_trend_label(row: pd.Series) -> str:
    """
    Classify the 1-year → 3-year trajectory.
    Matches the notebook's trend_label() function exactly.
    """
    change = (row["forecast_3y"] - row["forecast_1y"]) / max(abs(row["forecast_1y"]), 1)

    if change > 0.30:
        return "Explosive"
    if change > 0.10:
        return "Growing"
    if change > 0.00:
        return "Stable"
    return "Declining"


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("Loading data…")
    build_canonical_inputs()
    history = pd.read_csv(HISTORY_CSV)
    skills  = pd.read_csv(SKILLS_CSV)

    history["skill"] = history["skill"].str.lower().str.strip()
    skills["skill"]  = skills["skill"].str.lower().str.strip()

    logger.info(f"History shape: {history.shape}")
    logger.info(f"Skills shape:  {skills.shape}")
    logger.info(f"History years: {history['year'].min()} – {history['year'].max()}")

    # ── History length per skill ──────────────────────────────────────────────
    coverage = (
        history.groupby("skill")["year"]
        .nunique()
        .reset_index(name="history_length")
    )
    skills = skills.merge(coverage, on="skill", how="left")
    skills["history_length"] = skills["history_length"].fillna(0).astype(int)

    logger.info("History length distribution:\n" + str(skills["history_length"].describe()))

    # ── Normalise feature columns for feature-based projection ────────────────
    available_feat_cols = [c for c in FEATURE_COLS if c in skills.columns]
    missing_feat_cols   = [c for c in FEATURE_COLS if c not in skills.columns]

    if missing_feat_cols:
        logger.warning(f"Missing feature columns (will use 0): {missing_feat_cols}")
        for col in missing_feat_cols:
            skills[col] = 0.0

    scaler_feat = MinMaxScaler()
    feat_matrix = skills[FEATURE_COLS].fillna(0).values
    feat_norm   = scaler_feat.fit_transform(feat_matrix)

    skills_norm = skills.copy()
    skills_norm[FEATURE_COLS] = feat_norm

    # ── Latest demand lookup (base for feature-based projection) ──────────────
    base_year = int(history["year"].max())
    latest_demand = (
        history[history["year"] == base_year]
        .set_index("skill")["demand"]
    )
    logger.info(f"Base year for feature projection: {base_year}")

    # ── Main forecast loop ─────────────────────────────────────────────────────
    results = []

    for _, row in skills_norm.iterrows():
        skill = row["skill"]
        n_yrs = int(row["history_length"])

        try:
            if n_yrs >= HOLT_MIN_YEARS:
                p1, p2, p3 = holt_forecast(skill, history)
                method     = "Holt"
                confidence = 0.85

            elif n_yrs >= EXP_MIN_YEARS:
                p1, p2, p3 = exp_smoothing_forecast(skill, history)
                method     = "ExponentialSmoothing"
                confidence = 0.65

            else:
                p1, p2, p3 = feature_based_forecast(row, latest_demand)
                method     = "FeatureBased"
                confidence = 0.35 + 0.05 * n_yrs

        except Exception as exc:
            logger.debug(f"  {skill}: model failed ({exc}), falling back to FeatureBased")
            p1, p2, p3 = feature_based_forecast(row, latest_demand)
            method     = "FeatureBased"
            confidence = 0.30

        results.append({
            "skill":           skill,
            "history_length":  n_yrs,
            "forecast_method": method,
            "confidence":      round(confidence, 2),
            "forecast_1y":     round(p1, 4),
            "forecast_2y":     round(p2, 4),
            "forecast_3y":     round(p3, 4),
        })

    forecast_df = pd.DataFrame(results)
    logger.info(f"Forecast shape: {forecast_df.shape}")
    logger.info("Method distribution:\n" + str(forecast_df["forecast_method"].value_counts()))

    # ── Forecast intelligence scores ──────────────────────────────────────────
    forecast_df = compute_forecast_scores(forecast_df)

    # ── Trend labels ──────────────────────────────────────────────────────────
    forecast_df["forecast_trend"] = forecast_df.apply(assign_trend_label, axis=1)
    logger.info("Trend distribution:\n" + str(forecast_df["forecast_trend"].value_counts()))

    # ── Save ──────────────────────────────────────────────────────────────────
    output_cols = [
        "skill",
        "history_length",
        "forecast_method",
        "confidence",
        "forecast_1y",
        "forecast_2y",
        "forecast_3y",
        "forecast_score_1y",
        "forecast_score_2y",
        "forecast_score_3y",
        "forecast_score",
        "forecast_trend",
    ]

    forecast_df[output_cols].to_csv(OUTPUT_CSV, index=False)
    logger.info(f"Saved: {OUTPUT_CSV}")

    # ── Quick sanity check ────────────────────────────────────────────────────
    logger.info("\nSample — Python forecast:")
    py_row = forecast_df[forecast_df["skill"] == "python"]
    if not py_row.empty:
        r = py_row.iloc[0]
        logger.info(
            f"  method={r['forecast_method']}  confidence={r['confidence']}"
            f"  1y={r['forecast_1y']:.0f}  2y={r['forecast_2y']:.0f}  3y={r['forecast_3y']:.0f}"
            f"  score={r['forecast_score']:.4f}  trend={r['forecast_trend']}"
        )


if __name__ == "__main__":
    main()
