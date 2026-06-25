"""
build_knowledge_base.py — HSEP Knowledge Base Builder
Generates the three files consumed by the Career Advisor (14_Career_Advisor.ipynb):

    data/processed/skill_knowledge_base.json  — list of skill documents
    data/processed/faiss_index.bin            — FAISS IndexFlatIP (7-feature vectors)
    data/processed/faiss_metadata.json        — [{"skill": "..."}, ...] aligned to FAISS rows

Run AFTER all other pipeline scripts:
    python pipelines/build_knowledge_base.py

Inputs (from data/processed/):
    ses_rankings.csv
    forecast_results.csv
    cluster_assignments.csv
    master_skill_dataset_v8.csv
    industry_analytics.csv          (optional — adds industry list to each skill)
"""

import json
import logging
import numpy as np
import pandas as pd
from pathlib import Path

from data_quality import canonical_skill

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("build_knowledge_base")

DATA = Path("data/processed")

# Feature columns that become the FAISS embedding vector
# Order must match VECTOR_COLS in routers/advisor.py
VECTOR_COLS = [
    "linkedin_demand", "salary_premium", "current_usage",
    "future_interest", "growth_rate", "global_adoption", "ses_score",
]

# SES tier → plain-English risk label for narratives
TIER_LABEL = {
    "Very Safe": "a high-safety skill with strong combined workforce signals",
    "Safe": "a skill with favourable combined workforce signals",
    "Moderate": "a skill with mixed workforce signals that should be interpreted with its forecast confidence",
    "Risky": "a skill with weaker combined workforce signals that should be supplemented",
}

TREND_LABEL = {
    "Explosive": "explosive 3-year growth forecast",
    "Growing":   "growing 3-year demand forecast",
    "Stable":    "stable 3-year demand forecast",
    "Declining": "declining 3-year demand forecast",
}


def _narrative(row: pd.Series) -> str:
    """
    Auto-generate a ~150-word plain-English narrative for each skill.
    Used by the keyword retriever and LLM context block.
    """
    tier   = row.get("ses_tier", "Stable")
    arch   = row.get("archetype", "Stable")
    trend  = row.get("forecast_trend", "Stable")
    method = row.get("forecast_method", "FeatureBased")
    ses    = row.get("ses_score", 0)

    tier_desc  = TIER_LABEL.get(tier, "a skill with moderate market value")
    trend_desc = TREND_LABEL.get(trend, "a stable 3-year demand forecast")

    f1 = row.get("forecast_1y")
    f3 = row.get("forecast_3y")
    forecast_part = ""
    if f1 is not None and f3 is not None:
        forecast_part = (
            f" Demand forecasts (via {method}) project "
            f"{int(f1):,} mentions in year 1 and {int(f3):,} in year 3, "
            f"indicating {trend_desc}."
        )

    return (
        f"{row['skill'].title()} is {tier_desc} with a Skill Extinction Score (SES) of "
        f"{ses * 100:.1f} out of 100. "
        f"It is classified as '{arch}' in the HSEP archetype system.{forecast_part} "
        f"Key demand signals: LinkedIn demand index {row.get('linkedin_demand', 0):.2f}, "
        f"salary premium {row.get('salary_premium', 0):.2f}, "
        f"future interest {row.get('future_interest', 0):.2f}."
    )


def main() -> None:
    logger.info("Loading pipeline outputs…")

    ses       = pd.read_csv(DATA / "ses_rankings.csv")
    forecasts = pd.read_csv(DATA / "forecast_results.csv")
    clusters  = pd.read_csv(DATA / "cluster_assignments.csv")
    master    = pd.read_csv(DATA / "canonical_skill_master.csv")

    for df in [ses, forecasts, clusters, master]:
        df["skill"] = df["skill"].astype(str).str.strip().str.lower()

    # Industry mapping uses the source taxonomy rather than presentation-only
    # top-skill lists, so every skill can retain all of its industries.
    industry_skill_map: dict[str, list[str]] = {}
    industry_path = DATA / "industry_skill_map.csv"
    if industry_path.exists():
        ind = pd.read_csv(industry_path)
        for _, row in ind.iterrows():
            industry_skill_map.setdefault(canonical_skill(row["skill"]), []).append(str(row["industry"]))
        logger.info(f"Industry map loaded: {len(industry_skill_map)} skill→industry entries")

    # ── Merge all sources ─────────────────────────────────────────────────────
    df = master.merge(
        ses[["skill", "ses_score", "ses_tier", "archetype",
             "feature_score", "forecast_score", "cluster_score",
             "forecast_method", "forecast_trend"]],
        on="skill", how="left",
    ).merge(
        forecasts[["skill", "forecast_1y", "forecast_2y", "forecast_3y",
                   "forecast_score", "confidence", "history_length"]],
        on="skill", how="left", suffixes=("", "_fc"),
    ).merge(
        clusters[["skill", "cluster_id", "pca_x", "pca_y", "silhouette"]],
        on="skill", how="left",
    )

    # Use forecast_score from ses merge (not _fc duplicate)
    if "forecast_score_fc" in df.columns:
        df.drop(columns=["forecast_score_fc"], inplace=True)

    logger.info(f"Merged dataset: {len(df)} skills")

    # ── Fill missing features ─────────────────────────────────────────────────
    feat_fill = {c: 0.0 for c in VECTOR_COLS}
    df.fillna(feat_fill, inplace=True)

    # ── Build knowledge base documents ────────────────────────────────────────
    logger.info("Building skill documents…")
    knowledge_base = []

    for _, row in df.iterrows():
        doc = {
            # Identity
            "skill":       row["skill"],
            "sub_category": str(row.get("category") or row.get("sub_category") or ""),

            # SES
            "ses_score":    round(float(row.get("ses_score") or 0), 2),
            "ses_tier":     str(row.get("ses_tier") or ""),
            "archetype":    str(row.get("archetype") or ""),
            "feature_score": round(float(row.get("feature_score") or 0), 4),
            "cluster_score": round(float(row.get("cluster_score") or 0), 4),

            # Demand features (used in FAISS vector + narrative)
            "linkedin_demand":  round(float(row.get("linkedin_demand") or 0), 4),
            "salary_premium":   round(float(row.get("salary_premium") or 0), 4),
            "current_usage":    round(float(row.get("current_usage") or 0), 4),
            "future_interest":  round(float(row.get("future_interest") or 0), 4),
            "growth_rate":      round(float(row.get("growth_rate") or 0), 4),
            "global_adoption":  round(float(row.get("global_adoption_score") or 0), 4),

            # Forecasts
            "forecast_1y":     _safe_float(row.get("forecast_1y")),
            "forecast_2y":     _safe_float(row.get("forecast_2y")),
            "forecast_3y":     _safe_float(row.get("forecast_3y")),
            "forecast_trend":  str(row.get("forecast_trend") or ""),
            "forecast_method": str(row.get("forecast_method") or ""),
            "confidence":      _safe_float(row.get("confidence")),

            # Cluster
            "cluster_id": _safe_int(row.get("cluster_id")),
            "pca_x":      _safe_float(row.get("pca_x")),
            "pca_y":      _safe_float(row.get("pca_y")),

            # Industries
            "industries": industry_skill_map.get(row["skill"], []),

            # Auto-generated narrative for LLM context
            "narrative": _narrative(row),
        }
        knowledge_base.append(doc)

    # ── Save knowledge base ───────────────────────────────────────────────────
    kb_path = DATA / "skill_knowledge_base.json"
    with open(kb_path, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f, ensure_ascii=False)
    logger.info(f"Knowledge base saved: {kb_path}  ({len(knowledge_base)} skills)")

    # ── Build FAISS index ─────────────────────────────────────────────────────
    try:
        import faiss  # type: ignore

        vectors = np.array(
            [[doc.get(c, 0.0) or 0.0 for c in VECTOR_COLS] for doc in knowledge_base],
            dtype=np.float32,
        )

        # L2-normalise → IndexFlatIP becomes cosine similarity
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        vectors /= norms

        dim   = vectors.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(vectors)

        faiss_path = DATA / "faiss_index.bin"
        faiss.write_index(index, str(faiss_path))
        logger.info(f"FAISS index saved: {faiss_path}  ({index.ntotal} vectors, dim={dim})")

        meta_path = DATA / "faiss_metadata.json"
        metadata  = [{"skill": doc["skill"]} for doc in knowledge_base]
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f)
        logger.info(f"FAISS metadata saved: {meta_path}")

    except ImportError:
        logger.warning(
            "faiss-cpu is not installed. FAISS index NOT built. "
            "The advisor will use keyword retrieval instead. "
            "Install with: pip install faiss-cpu"
        )

    # ── Summary ───────────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 60)
    logger.info("Knowledge Base Build Summary")
    logger.info("=" * 60)
    logger.info(f"  Skills indexed : {len(knowledge_base)}")

    tier_counts = {}
    for doc in knowledge_base:
        t = doc.get("ses_tier", "Unknown")
        tier_counts[t] = tier_counts.get(t, 0) + 1
    for tier, count in sorted(tier_counts.items()):
        logger.info(f"  {tier:<20} {count}")

    trend_counts = {}
    for doc in knowledge_base:
        t = doc.get("forecast_trend", "Unknown")
        trend_counts[t] = trend_counts.get(t, 0) + 1
    logger.info("")
    for trend, count in sorted(trend_counts.items()):
        logger.info(f"  Trend={trend:<12} {count}")


def _safe_float(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
        return None if (f != f) else round(f, 4)   # NaN check
    except (TypeError, ValueError):
        return None


def _safe_int(v) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


if __name__ == "__main__":
    main()
