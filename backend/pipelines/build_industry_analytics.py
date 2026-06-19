"""
build_industry_analytics.py — Industry Analytics Pipeline
Aggregates SES scores, archetypes, and forecast data by industry taxonomy
to generate industry-level workforce intelligence metrics.

Output: data/processed/industry_analytics.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("build_industry_analytics")

DATA = Path("data/processed")
SES_CSV      = DATA / "ses_rankings.csv"
MASTER_CSV   = DATA / "master_skill_dataset_v8.csv"
FORECASTS_CSV = DATA / "forecast_results.csv"
OUTPUT_CSV   = DATA / "industry_analytics.csv"

# Industry → canonical skill list mapping
# Built from O*NET occupational taxonomy + LinkedIn job posting frequency analysis
INDUSTRY_SKILLS = {
    "artificial-intelligence": {
        "name": "Artificial Intelligence",
        "icon": "🤖",
        "skills": [
            "python", "pytorch", "tensorflow", "scikit-learn", "langchain", "rag",
            "llm", "mlflow", "hugging-face", "transformers", "prompt-engineering",
            "vector-databases", "cuda", "jax", "keras",
        ],
    },
    "cloud-infrastructure": {
        "name": "Cloud & Infrastructure",
        "icon": "☁️",
        "skills": [
            "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "ansible",
            "prometheus", "grafana", "helm", "istio", "argocd", "vault",
        ],
    },
    "data-engineering": {
        "name": "Data Engineering",
        "icon": "🗄️",
        "skills": [
            "python", "apache-spark", "sql", "airflow", "kafka", "dbt",
            "snowflake", "databricks", "postgresql", "redis", "elasticsearch",
            "flink", "delta-lake",
        ],
    },
    "cybersecurity": {
        "name": "Cybersecurity",
        "icon": "🔐",
        "skills": [
            "python", "bash", "networking", "siem", "zero-trust", "sast", "dast",
            "cloud-security", "incident-response", "cryptography", "penetration-testing",
            "iam", "devsecops",
        ],
    },
    "frontend-web": {
        "name": "Frontend & Web",
        "icon": "🌐",
        "skills": [
            "javascript", "typescript", "react", "nextjs", "vue", "angular",
            "tailwindcss", "webassembly", "graphql", "accessibility", "pwa",
        ],
    },
    "backend-engineering": {
        "name": "Backend Engineering",
        "icon": "⚙️",
        "skills": [
            "python", "go", "java", "rust", "fastapi", "nodejs", "grpc",
            "microservices", "postgresql", "redis", "kafka", "elasticsearch",
        ],
    },
    "mobile-development": {
        "name": "Mobile Development",
        "icon": "📱",
        "skills": [
            "swift", "kotlin", "react-native", "flutter", "dart",
            "objective-c", "android", "ios", "firebase",
        ],
    },
    "fintech": {
        "name": "FinTech",
        "icon": "💳",
        "skills": [
            "python", "java", "sql", "kafka", "blockchain", "smart-contracts",
            "compliance", "fraud-detection", "quantitative-finance", "risk-modeling",
        ],
    },
    "biotech-health": {
        "name": "Biotech & Health Tech",
        "icon": "🧬",
        "skills": [
            "python", "r", "bioinformatics", "pytorch", "nlp", "sql",
            "clinical-data", "hl7-fhir", "genomics",
        ],
    },
    "enterprise-erp": {
        "name": "Enterprise & ERP",
        "icon": "🏢",
        "skills": [
            "java", "dotnet", "sql", "sap", "oracle", "salesforce",
            "powerbi", "tableau", "excel", "sharepoint", "vba",
        ],
    },
}


def forecast_label(growth_pct: float) -> str:
    if growth_pct >= 40:
        return "Explosive"
    elif growth_pct >= 20:
        return "Strong"
    elif growth_pct >= 0:
        return "Stable"
    else:
        return "Contracting"


def main():
    logger.info("Loading pipeline artifacts…")
    ses       = pd.read_csv(SES_CSV)
    master    = pd.read_csv(MASTER_CSV)
    forecasts = pd.read_csv(FORECASTS_CSV)

    for df in [ses, master, forecasts]:
        df["skill"] = df["skill"].astype(str).str.strip().str.lower()

    # SES lookup
    ses_lookup = ses.set_index("skill")[["ses_score", "ses_tier", "archetype"]].to_dict("index")

    # Forecast 24m lookup
    f24 = forecasts[forecasts["horizon_months"] == 24].set_index("skill")["predicted"].to_dict()

    # History current adoption (latest year)
    if (DATA / "skill_demand_history_clean.csv").exists():
        history = pd.read_csv(DATA / "skill_demand_history_clean.csv")
        history["skill"] = history["skill"].astype(str).str.strip().str.lower()
        current_adoption = (
            history.sort_values("year")
            .groupby("skill")["adoption_rate"]
            .last()
            .to_dict()
        )
    else:
        current_adoption = {}

    industry_rows = []

    for ind_id, ind_data in INDUSTRY_SKILLS.items():
        name = ind_data["name"]
        icon = ind_data["icon"]
        skills = ind_data["skills"]

        # Gather SES scores
        ses_scores = [ses_lookup[s]["ses_score"] for s in skills if s in ses_lookup]
        archetypes = [ses_lookup[s]["archetype"] for s in skills if s in ses_lookup]

        if not ses_scores:
            logger.warning(f"  No SES data for industry: {name}")
            continue

        avg_ses = round(np.mean(ses_scores), 2)

        # Growth rate from forecast
        growth_rates = []
        for s in skills:
            current = current_adoption.get(s, 0.001)
            forecast = f24.get(s, None)
            if forecast is not None and current > 0:
                growth_rates.append((forecast - current) / current * 100)

        avg_growth = round(np.mean(growth_rates), 1) if growth_rates else 0.0

        # Extinction risk = % of industry skills that are At-Risk or Obsolete
        at_risk_count = sum(1 for a in archetypes if a in ("At-Risk", "Obsolete"))
        extinction_risk = round(at_risk_count / len(archetypes) * 100, 1) if archetypes else 0

        # Hiring index: normalized demand score of top skills
        demand_scores = [
            master.loc[master["skill"] == s, "linkedin_demand"].values[0]
            for s in skills
            if s in master["skill"].values
        ]
        hiring_index = round(np.mean(demand_scores) * 100, 1) if demand_scores else 50.0

        # Top 5 skills by SES score
        skill_ses = sorted(
            [(s, ses_lookup[s]["ses_score"]) for s in skills if s in ses_lookup],
            key=lambda x: x[1], reverse=True
        )
        top_skills = [s for s, _ in skill_ses[:5]]

        industry_rows.append({
            "id":              ind_id,
            "name":            name,
            "icon":            icon,
            "growth_rate":     avg_growth,
            "hiring_index":    hiring_index,
            "avg_ses":         avg_ses,
            "extinction_risk": extinction_risk,
            "forecast":        forecast_label(avg_growth),
            "top_skills":      json.dumps(top_skills),
            "skill_count":     len(skills),
        })

        logger.info(
            f"  {name}: avg_ses={avg_ses}, growth={avg_growth:.1f}%, "
            f"extinction_risk={extinction_risk}%, forecast={forecast_label(avg_growth)}"
        )

    df_out = pd.DataFrame(industry_rows)
    df_out.to_csv(OUTPUT_CSV, index=False)
    logger.info(f"\nIndustry analytics saved: {OUTPUT_CSV} ({len(df_out)} industries)")


if __name__ == "__main__":
    main()
