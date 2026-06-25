"""
build_skill_master.py — Database Seeding Pipeline
Reads all processed CSVs and populates the PostgreSQL tables via bulk upserts.

Forecast seeding updated for the one-row-per-skill schema produced by
build_forecasts.py (11_Hybrid_Forecasting.ipynb architecture).

Run order:
  1. python pipelines/build_clusters.py
  2. python pipelines/build_forecasts.py
  3. python pipelines/build_ses.py
  4. python pipelines/build_industry_analytics.py
  5. python pipelines/build_skill_master.py   ← this script
"""

import asyncio
import pandas as pd
import numpy as np
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.dialects.postgresql import insert as pg_insert
import logging
import re
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("build_skill_master")

DATA = Path("data/processed")

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://skilllens:skilllens@localhost:5432/skilllens",
)

BATCH_SIZE = 500


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")


def safe_float(v) -> float | None:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return float(v)


def safe_int(v) -> int | None:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return int(v)


async def seed(session: AsyncSession) -> None:
    # Import models inside function so they are bound to the correct metadata
    from models.skill import (
        Skill, SkillHistory, SESScore, ClusterAssignment, Forecast, Industry
    )

    # ── Load CSVs ─────────────────────────────────────────────────────────────
    logger.info("Loading pipeline outputs…")

    master    = pd.read_csv(DATA / "canonical_skill_master.csv")
    ses       = pd.read_csv(DATA / "ses_rankings.csv")
    clusters  = pd.read_csv(DATA / "cluster_assignments.csv")
    forecasts = pd.read_csv(DATA / "forecast_results.csv")  # one row per skill
    history   = pd.read_csv(DATA / "canonical_skill_demand_history.csv")

    for df in [master, ses, clusters, forecasts, history]:
        df["skill"] = df["skill"].astype(str).str.strip().str.lower()

    logger.info(
        f"Skills:{len(master)}  History:{len(history)}  "
        f"Forecasts:{len(forecasts)}  Clusters:{len(clusters)}"
    )

    # ── 1. Skills ─────────────────────────────────────────────────────────────
    logger.info("Seeding skills…")
    skill_records = []
    seen_skills = set()
    for _, row in master.iterrows():
        skill_id = slugify(row["skill"])
        if skill_id in seen_skills:
            continue
        seen_skills.add(skill_id)
        skill_records.append({
            "id":                 skill_id,
            "name":               row["skill"].title(),
            "category":           row.get("category"),
            "subcategory":        row.get("subcategory"),
            "lifecycle":          row.get("lifecycle"),
            "description":        row.get("description"),
            "linkedin_demand":    safe_float(row.get("linkedin_demand")),
            "salary_premium":     safe_float(row.get("salary_premium")),
            "current_usage":      safe_float(row.get("current_usage")),
            "future_interest":    safe_float(row.get("future_interest")),
            "global_adoption":    safe_float(row.get("global_adoption_score")),
            "growth_rate":        safe_float(row.get("growth_rate")),
            "momentum_score":     safe_float(row.get("momentum_score")),
            "volatility_score":   safe_float(row.get("volatility_score")),
            "growth_consistency": safe_float(row.get("growth_consistency")),
            "cagr":               safe_float(row.get("cagr")),
            "trend_slope":        safe_float(row.get("trend_slope")),
        })

    for i in range(0, len(skill_records), BATCH_SIZE):
        batch = skill_records[i : i + BATCH_SIZE]
        stmt = pg_insert(Skill.__table__).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={k: stmt.excluded[k] for k in batch[0] if k != "id"},
        )
        await session.execute(stmt)
    await session.commit()
    logger.info(f"  {len(skill_records)} skills upserted.")

    # ── 2. Skill history ──────────────────────────────────────────────────────
    logger.info("Seeding skill history…")
    history_records = []
    seen_history = set()
    for _, row in history.iterrows():
        skill_id = slugify(row["skill"])
        if skill_id not in seen_skills:
            continue
        year = int(row["year"])
        key = (skill_id, year)
        if key in seen_history:
            continue
        seen_history.add(key)
        history_records.append({
            "skill_id":     skill_id,
            "year":         year,
            "demand":       safe_int(row.get("demand")) or 0,
            "adoption_rate":safe_float(row.get("adoption_rate")),
            "survey_size":  safe_int(row.get("survey_size")) or 0,
        })

    for i in range(0, len(history_records), BATCH_SIZE):
        batch = history_records[i : i + BATCH_SIZE]
        stmt = pg_insert(SkillHistory.__table__).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["skill_id", "year"],
            set_={"demand": stmt.excluded.demand, "adoption_rate": stmt.excluded.adoption_rate},
        )
        await session.execute(stmt)
    await session.commit()
    logger.info(f"  {len(history_records)} history rows upserted.")

    # ── 3. Clusters ───────────────────────────────────────────────────────────
    logger.info("Seeding cluster assignments…")
    cluster_records = []
    seen_clusters = set()
    for _, row in clusters.iterrows():
        skill_id = slugify(row["skill"])
        if skill_id not in seen_skills or skill_id in seen_clusters:
            continue
        seen_clusters.add(skill_id)
        cluster_records.append({
            "skill_id":     skill_id,
            "cluster_id":   int(row["cluster_id"]),
            "archetype":    row.get("archetype"),
            "pca_x":        safe_float(row.get("pca_x")),
            "pca_y":        safe_float(row.get("pca_y")),
            "silhouette":   safe_float(row.get("silhouette")),
            "centroid_dist":safe_float(row.get("centroid_dist")),
        })

    for i in range(0, len(cluster_records), BATCH_SIZE):
        batch = cluster_records[i : i + BATCH_SIZE]
        stmt = pg_insert(ClusterAssignment.__table__).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["skill_id"],
            set_={k: stmt.excluded[k] for k in batch[0] if k != "skill_id"},
        )
        await session.execute(stmt)
    await session.commit()
    logger.info(f"  {len(cluster_records)} cluster rows upserted.")

    # ── 4. SES scores ─────────────────────────────────────────────────────────
    logger.info("Seeding SES scores…")
    ses_records = []
    seen_ses = set()
    for _, row in ses.iterrows():
        skill_id = slugify(row["skill"])
        if skill_id not in seen_skills or skill_id in seen_ses:
            continue
        seen_ses.add(skill_id)
        ses_records.append({
            "skill_id":       skill_id,
            "ses_score":      safe_float(row["ses_score"]),
            "ses_tier":       row.get("ses_tier"),
            "feature_score":  safe_float(row.get("feature_score")),
            "forecast_score": safe_float(row.get("forecast_score")),
            "cluster_score":  safe_float(row.get("cluster_score")),
            "ses_delta_30d":  safe_float(row.get("ses_delta_30d", 0.0)),
        })

    for i in range(0, len(ses_records), BATCH_SIZE):
        batch = ses_records[i : i + BATCH_SIZE]
        stmt = pg_insert(SESScore.__table__).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["skill_id"],
            set_={k: stmt.excluded[k] for k in batch[0] if k != "skill_id"},
        )
        await session.execute(stmt)
    await session.commit()
    logger.info(f"  {len(ses_records)} SES rows upserted.")

    # ── 5. Forecasts (one row per skill) ──────────────────────────────────────
    logger.info("Seeding forecasts…")
    forecast_records = []
    seen_forecasts = set()
    for _, row in forecasts.iterrows():
        skill_id = slugify(row["skill"])
        if skill_id not in seen_skills or skill_id in seen_forecasts:
            continue
        seen_forecasts.add(skill_id)
        forecast_records.append({
            "skill_id":          skill_id,
            "forecast_1y":       safe_float(row.get("forecast_1y")),
            "forecast_2y":       safe_float(row.get("forecast_2y")),
            "forecast_3y":       safe_float(row.get("forecast_3y")),
            "forecast_score_1y": safe_float(row.get("forecast_score_1y")),
            "forecast_score_2y": safe_float(row.get("forecast_score_2y")),
            "forecast_score_3y": safe_float(row.get("forecast_score_3y")),
            "forecast_score":    safe_float(row.get("forecast_score")),
            "forecast_method":   row.get("forecast_method"),
            "forecast_trend":    row.get("forecast_trend"),
            "confidence":        safe_float(row.get("confidence")),
            "history_length":    safe_int(row.get("history_length")),
        })

    for i in range(0, len(forecast_records), BATCH_SIZE):
        batch = forecast_records[i : i + BATCH_SIZE]
        stmt = pg_insert(Forecast.__table__).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["skill_id"],
            set_={k: stmt.excluded[k] for k in batch[0] if k != "skill_id"},
        )
        await session.execute(stmt)
    await session.commit()
    logger.info(f"  {len(forecast_records)} forecast rows upserted.")

    # ── 6. Industries ─────────────────────────────────────────────────────────
    logger.info("Seeding industries…")
    industry_csv_path = DATA / "industry_analytics.csv"
    if industry_csv_path.exists():
        industry_df = pd.read_csv(industry_csv_path)
        
        industry_skills_map = {
            "data-analytics": ["python", "sql", "excel", "tableau", "power-bi", "r", "statistics", "data-visualization", "pandas", "numpy"],
            "software-engineering": ["java", "python", "javascript", "typescript", "c-plus-plus", "c-sharp", "go", "rust", "git", "docker", "kubernetes", "system-design", "react", "html", "css"],
            "data-science": ["python", "r", "sql", "pandas", "numpy", "scikit-learn", "jupyter", "statistics", "machine-learning", "deep-learning"],
            "ai-ml": ["python", "pytorch", "tensorflow", "scikit-learn", "langchain", "rag", "llm", "transformers", "hugging-face", "prompt-engineering", "vector-databases", "keras", "cuda"],
            "cybersecurity": ["networking", "siem", "zero-trust", "firewalls", "cryptography", "penetration-testing", "iam", "wireshark", "linux", "cloud-security"],
            "data-engineering": ["python", "apache-spark", "sql", "airflow", "kafka", "dbt", "snowflake", "databricks", "postgresql", "hadoop", "etl"],
            "cloud-devops": ["aws", "azure", "gcp", "kubernetes", "docker", "terraform", "ansible", "jenkins", "git", "linux", "ci-cd"],
            "systems-engineering": ["c-plus-plus", "c", "rust", "linux", "embedded-systems", "rtos", "microcontrollers", "arm", "fpga"]
        }
        
        icons_map = {
            "data-analytics": "📈",
            "software-engineering": "💻",
            "data-science": "🔬",
            "ai-ml": "🤖",
            "cybersecurity": "🛡️",
            "data-engineering": "🗄️",
            "cloud-devops": "☁️",
            "systems-engineering": "⚙️"
        }

        ses_dict = {r["skill_id"]: r["ses_score"] for r in ses_records}
        industry_records = []
        
        for _, row in industry_df.iterrows():
            name = row["industry"]
            ind_id = slugify(name)
            
            # Map top skills
            ind_skills = industry_skills_map.get(ind_id, [])
            ind_skills_with_scores = []
            for s in ind_skills:
                score = ses_dict.get(s, 0.0)
                ind_skills_with_scores.append((s, score))
            ind_skills_with_scores.sort(key=lambda x: x[1], reverse=True)
            top_skills = [s[0].upper() if len(s[0]) <= 3 else s[0].title() for s in ind_skills_with_scores[:5]]

            # Metrics (convert fractions to percentages)
            growth_rate = safe_float(row.get("avg_growth_rate"))
            if growth_rate is not None and growth_rate < 1.0:
                growth_rate *= 100
                
            hiring_index = safe_float(row.get("avg_linkedin_demand"))
            if hiring_index is not None and hiring_index < 1.0:
                hiring_index *= 100

            avg_ses = safe_float(row.get("avg_ses_score"))
            if avg_ses is not None and avg_ses < 1.0:
                avg_ses *= 100

            # Extinction risk: percentage of risky/extinction-risk skills
            skill_count = safe_int(row.get("skill_count")) or 1
            risky_count = safe_int(row.get("risky_count")) or 0
            ext_count = safe_int(row.get("extinction_risk_count")) or 0
            extinction_risk = ((risky_count + ext_count) / skill_count) * 100

            # Forecast label
            if growth_rate is not None:
                if growth_rate >= 40:
                    forecast_lbl = "Explosive"
                elif growth_rate >= 20:
                    forecast_lbl = "Strong"
                elif growth_rate >= 0:
                    forecast_lbl = "Stable"
                else:
                    forecast_lbl = "Contracting"
            else:
                forecast_lbl = "Stable"

            industry_records.append({
                "id":              ind_id,
                "name":            name,
                "icon":            icons_map.get(ind_id, "💼"),
                "growth_rate":     growth_rate,
                "hiring_index":    hiring_index,
                "avg_ses":         avg_ses,
                "extinction_risk": extinction_risk,
                "forecast":        forecast_lbl,
                "top_skills":      top_skills,
                "skill_count":     skill_count,
            })

        for i in range(0, len(industry_records), BATCH_SIZE):
            batch = industry_records[i : i + BATCH_SIZE]
            stmt = pg_insert(Industry.__table__).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={k: stmt.excluded[k] for k in batch[0] if k != "id"},
            )
            await session.execute(stmt)
        await session.commit()
        logger.info(f"  {len(industry_records)} industry rows upserted.")
    else:
        logger.warning("industry_analytics.csv not found, skipping industry seeding.")

    logger.info("Database seeding complete.")


async def main() -> None:
    engine = create_async_engine(DB_URL, echo=False)
    AsyncSession_ = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with AsyncSession_() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
