"""Fail-fast validation for canonical HSEP data artifacts.

Run after the pipeline to catch schema drift, mismatched joins, alias leaks, or
out-of-range score values before the frontend snapshot is generated.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from data_quality import ALIASES, DATA, canonical_skill


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def main() -> None:
    master = pd.read_csv(DATA / "canonical_skill_master.csv")
    history = pd.read_csv(DATA / "canonical_skill_demand_history.csv")
    forecasts = pd.read_csv(DATA / "forecast_results.csv")
    ses = pd.read_csv(DATA / "ses_rankings.csv")
    clusters = pd.read_csv(DATA / "cluster_assignments.csv")
    industries = pd.read_csv(DATA / "industry_analytics.csv")
    failures: list[str] = []

    artifacts = {"master": master, "forecasts": forecasts, "ses": ses, "clusters": clusters}
    expected = set(master["skill"])
    for name, frame in artifacts.items():
        if frame["skill"].duplicated().any():
            fail(f"{name}: duplicate skill identifiers", failures)
        leaked = [skill for skill in frame["skill"] if canonical_skill(skill) != skill]
        if leaked:
            fail(f"{name}: non-canonical aliases present: {sorted(set(leaked))}", failures)
        if set(frame["skill"]) != expected:
            missing = sorted(expected - set(frame["skill"]))
            extra = sorted(set(frame["skill"]) - expected)
            fail(f"{name}: join mismatch (missing={missing}, extra={extra})", failures)

    for feature in ["linkedin_demand", "salary_premium", "current_usage", "future_interest", "global_adoption_score", "growth_rate"]:
        if not master[feature].between(0, 1).all():
            fail(f"master: {feature} is outside the 0-1 feature contract", failures)
    if not ses["ses_score"].between(0, 1).all():
        fail("SES scores are outside the 0-1 score contract", failures)
    if not forecasts["confidence"].between(0, 1).all():
        fail("Forecast confidence is outside the 0-1 score contract", failures)
    if forecasts[["forecast_1y", "forecast_2y", "forecast_3y"]].isna().any().any():
        fail("Forecast output contains missing horizon values", failures)
    if (forecasts[["forecast_1y", "forecast_2y", "forecast_3y"]] < 0).any().any():
        fail("Forecast output contains negative demand values", failures)
    if history.duplicated(["skill", "year"]).any():
        fail("Canonical history contains duplicate skill-year rows", failures)
    if set(clusters["archetype"]) - {"Future-Proof", "Growing", "Stable", "High-Risk"}:
        fail("Clusters contain unsupported archetype labels", failures)
    if len(industries) != 8:
        fail(f"Industry analytics expected 8 industries, found {len(industries)}", failures)

    if failures:
        raise SystemExit("Data validation failed:\n- " + "\n- ".join(failures))
    report = json.loads((DATA / "data_quality_report.json").read_text(encoding="utf-8"))
    print(
        "Data validation passed: "
        f"{len(master)} canonical skills, {len(history)} skill-year records, "
        f"{len(industries)} industries; aliases resolved={report['merged_skill_alias_rows']}."
    )


if __name__ == "__main__":
    main()
