"""Standalone HSEP career-advisor helper.

This module is optional; the deployed FastAPI advisor lives in
``backend/routers/advisor.py``. It intentionally reads provider credentials from
the environment and never embeds them in the repository.
"""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path
from typing import Any

import numpy as np


DATA_DIR = Path(__file__).resolve().parent
KB_PATH = DATA_DIR / "skill_knowledge_base.json"
META_PATH = DATA_DIR / "faiss_metadata.json"
FAISS_PATH = DATA_DIR / "faiss_index.bin"

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
OPENROUTER_URL = os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1/chat/completions")

SYSTEM_PROMPT = (
    "You are the HSEP Career Advisor. Ground every recommendation in the "
    "provided skill context and cite SES scores, tiers, and forecast trends."
)

VECTOR_COLUMNS = [
    "linkedin_demand",
    "salary_premium",
    "current_usage",
    "future_interest",
    "growth_rate",
    "global_adoption",
    "ses_score",
]


def _load_knowledge_base() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    with KB_PATH.open(encoding="utf-8") as source:
        documents = json.load(source)
    return documents, {str(document["skill"]).lower(): document for document in documents}


def _keyword_retrieve(query: str, documents: list[dict[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    tokens = {token for token in query.lower().split() if token}
    scored: list[tuple[int, dict[str, Any]]] = []
    for document in documents:
        skill = str(document.get("skill", ""))
        text = " ".join([
            skill,
            str(document.get("sub_category", "")),
            str(document.get("narrative", "")),
        ]).lower()
        value = sum(token in text for token in tokens) + (10 if skill.lower() in query.lower() else 0)
        if value:
            scored.append((value, document))
    return [document for _, document in sorted(scored, key=lambda item: item[0], reverse=True)[:limit]]


def _faiss_retrieve(anchor: str, index: dict[str, dict[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    if not FAISS_PATH.exists() or not META_PATH.exists() or anchor not in index:
        return []
    try:
        import faiss  # type: ignore

        vector_index = faiss.read_index(str(FAISS_PATH))
        metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
        document = index[anchor]
        vector = np.array([[float(document.get(column) or 0) for column in VECTOR_COLUMNS]], dtype=np.float32)
        norm = np.linalg.norm(vector)
        if norm:
            vector /= norm
        _, identifiers = vector_index.search(vector, limit)
        return [index[item["skill"].lower()] for position in identifiers[0] if position >= 0 for item in [metadata[position]] if item["skill"].lower() in index]
    except Exception:
        return []


def _build_context(documents: list[dict[str, Any]]) -> str:
    return "\n\n".join(
        "\n".join([
            f"SKILL: {str(document.get('skill', 'Unknown')).title()}",
            f"SES: {document.get('ses_score', 'N/A')} ({document.get('ses_tier', 'N/A')})",
            f"Archetype: {document.get('archetype', 'N/A')} | Forecast: {document.get('forecast_trend', 'N/A')}",
            str(document.get("narrative", ""))[:240],
        ])
        for document in documents
    )


def career_advisor(query: str) -> dict[str, Any]:
    """Return a data-grounded answer using the optional OpenRouter provider."""
    documents, index = _load_knowledge_base()
    anchor = next((skill for skill in index if skill in query.lower()), "")
    retrieved = _faiss_retrieve(anchor, index) or _keyword_retrieve(query, documents)
    result: dict[str, Any] = {
        "query": query,
        "retrieved_skills": [document.get("skill") for document in retrieved],
        "answer": "",
    }

    if not OPENROUTER_API_KEY:
        result["answer"] = "OPENROUTER_API_KEY is not configured. Use the retrieved skills for a local, data-grounded response."
        return result

    payload = json.dumps({
        "model": OPENROUTER_MODEL,
        "max_tokens": 900,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{_build_context(retrieved)}\n\nQuestion: {query}"},
        ],
    }).encode("utf-8")
    request = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {OPENROUTER_API_KEY}"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        body = json.loads(response.read().decode("utf-8"))
    result["answer"] = body["choices"][0]["message"]["content"]
    return result
