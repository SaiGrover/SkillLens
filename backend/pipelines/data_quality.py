"""Canonicalisation and validation helpers for the HSEP CSV pipeline.

The research exports use a mixture of source-specific spellings (for example,
``cyber security`` and ``cybersecurity``).  This module is the single place
where those spellings are resolved before any model input is built.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


DATA = Path("data/processed")
RAW_MASTER_CSV = DATA / "expanded_skill_master.csv"
RAW_HISTORY_CSV = DATA / "skill_demand_history_clean.csv"
MASTER_CSV = DATA / "canonical_skill_master.csv"
HISTORY_CSV = DATA / "canonical_skill_demand_history.csv"
REPORT_JSON = DATA / "data_quality_report.json"

# Only direct spelling variants are merged.  Related concepts such as
# "Excel" and "Advanced Excel" remain distinct skills deliberately.
ALIASES = {
    "cyber security": "cybersecurity",
    "nodejs": "node.js",
    "couch db": "couchdb",
    "digital ocean": "digitalocean",
    "powerbi": "power bi",
    "ms excel": "excel",
    "microsoft excel": "excel",
    "amazon web services": "aws",
    "google cloud platform": "google cloud",
    "github.com": "github",
}

DISPLAY_NAMES = {
    "api": "API",
    "apis": "APIs",
    "aws": "AWS",
    "c#": "C#",
    "c++": "C++",
    "c/c++": "C/C++",
    "ci/cd": "CI/CD",
    "devops": "DevOps",
    "etl": "ETL",
    "gcp": "GCP",
    "github": "GitHub",
    "llm": "LLM",
    "mlops": "MLOps",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "node.js": "Node.js",
    "nosql": "NoSQL",
    "php": "PHP",
    "plc programming": "PLC Programming",
    "power bi": "Power BI",
    "postgresql": "PostgreSQL",
    "pytorch": "PyTorch",
    "rag": "RAG",
    "sql": "SQL",
    "sql server": "SQL Server",
    "tensorflow": "TensorFlow",
    "typescript": "TypeScript",
}


def canonical_skill(value: object) -> str:
    """Return a stable lower-case identifier for a source skill name."""
    skill = str(value).strip().lower()
    skill = re.sub(r"\s+", " ", skill)
    return ALIASES.get(skill, skill)


def display_skill(value: object) -> str:
    """Format canonical identifiers for UI and report presentation."""
    skill = canonical_skill(value)
    return DISPLAY_NAMES.get(skill, " ".join(word.capitalize() for word in skill.split(" ")))


def _weighted_mean(group: pd.DataFrame, column: str) -> float:
    values = pd.to_numeric(group[column], errors="coerce")
    weights = pd.to_numeric(group.get("linkedin_demand"), errors="coerce").fillna(0)
    if weights.sum() > 0:
        return float(np.average(values.fillna(values.median()), weights=weights))
    return float(values.mean())


def _mode(values: Iterable[object]) -> str:
    series = pd.Series(list(values)).dropna().astype(str)
    return series.mode().iloc[0] if not series.empty else "Unassigned"


def build_canonical_inputs() -> dict[str, int]:
    """Create validated, alias-resolved inputs for every downstream model."""
    raw_master = pd.read_csv(RAW_MASTER_CSV)
    raw_history = pd.read_csv(RAW_HISTORY_CSV)

    raw_master["skill"] = raw_master["skill"].map(canonical_skill)
    feature_columns = [
        "linkedin_demand", "salary_premium", "current_usage", "future_interest",
        "global_adoption_score", "growth_rate",
    ]
    rows: list[dict[str, object]] = []
    for skill, group in raw_master.groupby("skill", sort=True):
        row: dict[str, object] = {
            "skill": skill,
            "sub_category": _mode(group["sub_category"]),
            "history_found": int(pd.to_numeric(group["history_found"], errors="coerce").fillna(0).max()),
        }
        # Demand is an occurrence signal.  Alias occurrences are additive;
        # all other feature signals are demand-weighted means.
        row["linkedin_demand"] = float(pd.to_numeric(group["linkedin_demand"], errors="coerce").fillna(0).sum())
        for column in feature_columns[1:]:
            row[column] = _weighted_mean(group, column)
        rows.append(row)

    master = pd.DataFrame(rows)
    # The source Global Adoption field is a 134-175 composite count.  Every
    # downstream feature must be on a 0-1 scale, so normalise it once here.
    low = master["global_adoption_score"].min()
    high = master["global_adoption_score"].max()
    if high > low:
        master["global_adoption_score"] = (master["global_adoption_score"] - low) / (high - low)
    else:
        master["global_adoption_score"] = 0.5
    # Alias aggregation can make demand exceed its old maximum. Re-scale after
    # aggregation so the feature contract remains [0, 1].
    demand_max = master["linkedin_demand"].max()
    if demand_max > 0:
        master["linkedin_demand"] = master["linkedin_demand"] / demand_max
    master.to_csv(MASTER_CSV, index=False)

    raw_history["skill"] = raw_history["skill"].map(canonical_skill)
    raw_history["year"] = pd.to_numeric(raw_history["year"], errors="coerce").astype("Int64")
    raw_history["demand"] = pd.to_numeric(raw_history["demand"], errors="coerce")
    raw_history["adoption_rate"] = pd.to_numeric(raw_history["adoption_rate"], errors="coerce")
    history = (
        raw_history.dropna(subset=["year", "demand"])
        .groupby(["skill", "year"], as_index=False)
        # Source spellings can represent the same survey response. Use the
        # maximum rather than summing to avoid double-counting it.
        .agg(demand=("demand", "max"), adoption_rate=("adoption_rate", "max"))
        .sort_values(["skill", "year"])
    )
    history["year"] = history["year"].astype(int)
    history.to_csv(HISTORY_CSV, index=False)

    master_skills = set(master["skill"])
    history_skills = set(history["skill"])
    report = {
        "raw_skill_rows": int(len(raw_master)),
        "canonical_skill_rows": int(len(master)),
        "merged_skill_alias_rows": int(len(raw_master) - len(master)),
        "raw_history_rows": int(len(raw_history)),
        "canonical_history_rows": int(len(history)),
        "history_alias_rows_collapsed": int(len(raw_history) - len(history)),
        "master_skills_without_history": sorted(master_skills - history_skills),
        "global_adoption_scale": "min-max normalized to [0, 1] from source composite counts",
        "alias_map": ALIASES,
    }
    REPORT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return {"skills": len(master), "history_rows": len(history)}


if __name__ == "__main__":
    summary = build_canonical_inputs()
    print(f"Canonical inputs written: {summary['skills']} skills, {summary['history_rows']} history rows")
