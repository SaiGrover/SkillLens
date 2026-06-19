"""
advisor.py — HSEP Career Advisor Router
Based on 14_Career_Advisor.ipynb

Architecture:
    User Query
        ↓
    FAISS Semantic Retrieval  (top-6 skill documents from faiss_index.bin)
        OR keyword fallback   (BM25-lite token matching on skill_knowledge_base.json)
        ↓
    Context Assembly          (SKILL / SES / Archetype / Forecast / Narrative blocks)
        ↓
    OpenRouter LLM            (openai/gpt-oss-120b:free via /v1/chat/completions)
        ↓
    Structured Answer

Knowledge base files (place in data/processed/):
    skill_knowledge_base.json   — list of skill documents with SES, forecast, narrative
    faiss_index.bin             — FAISS IndexFlatIP built from 7-feature vectors
    faiss_metadata.json         — list of {"skill": "..."} matching FAISS row order
"""

import json
import numpy as np
import urllib.request
import urllib.error
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.config import settings

router = APIRouter()
logger = logging.getLogger("advisor")

# ── Knowledge base paths ──────────────────────────────────────────────────────
DATA_DIR   = Path(settings.DATA_DIR)
KB_PATH    = DATA_DIR / "skill_knowledge_base.json"
FAISS_PATH = DATA_DIR / "faiss_index.bin"
META_PATH  = DATA_DIR / "faiss_metadata.json"

# ── Feature vector columns (must match build order in knowledge base builder) ─
VECTOR_COLS = [
    "linkedin_demand", "salary_premium", "current_usage",
    "future_interest", "growth_rate", "global_adoption", "ses_score",
]

# ── OpenRouter config ─────────────────────────────────────────────────────────
OPENROUTER_URL   = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-oss-120b:free"

# ── System prompt — matches notebook exactly ──────────────────────────────────
SYSTEM_PROMPT = """You are HSEP Career Advisor — a precise, data-driven career intelligence assistant.

You have access to a skill intelligence database covering SES scores, demand forecasts,
industry relevance, and archetype classifications for hundreds of technical skills.

Rules:
- Ground every recommendation in the provided skill context.
- Cite SES scores, tiers, and forecast trends when relevant.
- Be concise but specific. Avoid generic career advice.
- If the user asks to compare skills, structure the answer as a comparison table.
- Always end with a one-line actionable recommendation.
"""

# ── Module-level state (loaded once on first request) ─────────────────────────
_knowledge_base: list = []
_kb_index: dict = {}          # skill → doc
_faiss_index = None
_faiss_meta: list = []
_faiss_available: bool = False


def _load_knowledge_base() -> None:
    """Load skill_knowledge_base.json into memory. Called lazily on first request."""
    global _knowledge_base, _kb_index
    if _knowledge_base:
        return  # already loaded

    if not KB_PATH.exists():
        logger.warning(
            f"Knowledge base not found at {KB_PATH}. "
            "Run build_knowledge_base.py to generate it. "
            "Advisor will operate in degraded mode."
        )
        return

    with open(KB_PATH, encoding="utf-8") as f:
        _knowledge_base = json.load(f)

    _kb_index = {doc["skill"]: doc for doc in _knowledge_base}
    logger.info(f"Knowledge base loaded: {len(_knowledge_base)} skills")


def _load_faiss() -> None:
    """Load FAISS index + metadata. Falls back gracefully if faiss-cpu not installed."""
    global _faiss_index, _faiss_meta, _faiss_available

    if _faiss_available:
        return

    try:
        import faiss  # type: ignore
        if not FAISS_PATH.exists() or not META_PATH.exists():
            logger.info("FAISS index files not found — using keyword retriever.")
            return

        _faiss_index = faiss.read_index(str(FAISS_PATH))
        with open(META_PATH, encoding="utf-8") as f:
            _faiss_meta = json.load(f)

        _faiss_available = True
        logger.info(f"FAISS index loaded: {_faiss_index.ntotal} vectors")

    except ImportError:
        logger.info("faiss-cpu not installed — using keyword fallback retriever.")
    except Exception as exc:
        logger.warning(f"FAISS load failed: {exc} — using keyword fallback.")


# ── Retrieval ─────────────────────────────────────────────────────────────────

def _faiss_retrieve(anchor_skill: str, k: int = 6) -> list[dict]:
    """Vector similarity search using the anchor skill's feature vector."""
    if anchor_skill not in _kb_index:
        return []

    doc = _kb_index[anchor_skill]
    vec = np.array(
        [[doc.get(c, 0.0) or 0.0 for c in VECTOR_COLS]],
        dtype=np.float32,
    )
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec /= norm

    D, I = _faiss_index.search(vec, k)
    results = []
    for dist, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(_faiss_meta):
            continue
        skill = _faiss_meta[idx]["skill"]
        if skill in _kb_index:
            results.append({"score": float(dist), "doc": _kb_index[skill]})
    return results


def _keyword_retrieve(query: str, k: int = 6) -> list[dict]:
    """
    BM25-lite token matching against skill names + sub_category + narrative.
    Exact skill-name match gets +10 boost (matches notebook implementation).
    """
    tokens = set(query.lower().split())
    scored = []
    query_lower = query.lower()

    for doc in _knowledge_base:
        text = (
            f"{doc['skill']} "
            f"{doc.get('sub_category', '')} "
            f"{doc.get('narrative', '')}"
        ).lower()

        score = sum(1 for t in tokens if t in text)
        if doc["skill"] in query_lower:
            score += 10

        if score > 0:
            scored.append((score, doc))

    scored.sort(key=lambda x: -x[0])
    return [{"score": s, "doc": d} for s, d in scored[:k]]


def _retrieve(query: str, anchor_skill: Optional[str], k: int = 6) -> list[dict]:
    """Unified retrieval: FAISS when available + anchor known, else keyword."""
    if _faiss_available and anchor_skill and anchor_skill in _kb_index:
        return _faiss_retrieve(anchor_skill, k=k)
    return _keyword_retrieve(query, k=k)


def _extract_anchor(query: str) -> Optional[str]:
    """
    Simple heuristic: return the first known skill name found in the query.
    Matches notebook: next((doc['skill'] for doc in kb if doc['skill'] in query_lower), None)
    """
    query_lower = query.lower()
    return next(
        (doc["skill"] for doc in _knowledge_base if doc["skill"] in query_lower),
        None,
    )


def _build_context(retrieved: list[dict]) -> str:
    """
    Format retrieved skill documents into an LLM context string.
    Matches notebook build_context() format exactly.
    """
    lines = []
    for item in retrieved:
        doc = item["doc"]
        lines.append(
            f"SKILL: {doc['skill'].title()}\n"
            f"  Category   : {doc.get('sub_category', '?')}\n"
            f"  SES Score  : {doc.get('ses_score', '?')} ({doc.get('ses_tier', '?')})\n"
            f"  Archetype  : {doc.get('archetype', '?')}\n"
            f"  Industries : {', '.join(doc.get('industries', [])) or 'General'}\n"
            f"  Forecast   : 1yr={doc.get('forecast_1y', '?')}  "
            f"3yr={doc.get('forecast_3y', '?')}  "
            f"Trend={doc.get('forecast_trend', '?')}\n"
            f"  Summary    : {doc.get('narrative', '')[:220]}\n"
        )
    return "\n".join(lines)


# ── LLM call ──────────────────────────────────────────────────────────────────

def _call_openrouter(messages: list[dict], system: str = SYSTEM_PROMPT) -> str:
    """
    POST to OpenRouter /v1/chat/completions.
    Uses openai/gpt-oss-120b:free — matches notebook exactly.
    Requires settings.OPENROUTER_API_KEY.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise ValueError(
            "OPENROUTER_API_KEY is not set. Add it to your .env file."
        )

    # Inject system prompt as first message (OpenAI-style)
    oai_messages = [{"role": "system", "content": system}] + [
        {"role": m["role"], "content": m["content"]}
        for m in messages
    ]

    payload = json.dumps({
        "model":      OPENROUTER_MODEL,
        "max_tokens": 1000,
        "messages":   oai_messages,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer":  "https://hsep.app",
            "X-Title":       "HSEP Career Advisor",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read())
            return body["choices"][0]["message"]["content"]

    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        logger.error(f"OpenRouter HTTP {e.code}: {detail}")
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter error {e.code}: {detail[:200]}",
        )
    except Exception as exc:
        logger.error(f"OpenRouter call failed: {exc}")
        raise HTTPException(status_code=502, detail=f"LLM unavailable: {exc}")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str     # "user" | "assistant"
    content: str


class AdvisorRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class SkillReference(BaseModel):
    skill: str
    ses_score: Optional[float]
    ses_tier: Optional[str]
    archetype: Optional[str]
    forecast_trend: Optional[str]
    forecast_1y: Optional[float]
    forecast_3y: Optional[float]
    sub_category: Optional[str]


class AdvisorResponse(BaseModel):
    reply: str
    retrieved_skills: list[str]
    skill_references: list[SkillReference]
    anchor_skill: Optional[str]
    query_type: str


# ── Query classifier ──────────────────────────────────────────────────────────

def _classify_query(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["compare", "vs", "versus", " or "]):
        return "comparison"
    if any(w in msg for w in ["obsolete", "dying", "at risk", "avoid", "decline"]):
        return "extinction_risk"
    if any(w in msg for w in ["should i learn", "worth learning", "recommend"]):
        return "recommendation"
    if any(w in msg for w in ["roadmap", "path", "transition", "move to", "become"]):
        return "roadmap"
    if any(w in msg for w in ["top skills", "best skills", "focus on", "junior", "senior"]):
        return "skill_list"
    if any(w in msg for w in ["forecast", "future", "2025", "2026", "trend", "next"]):
        return "forecast_inquiry"
    return "general"


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=AdvisorResponse)
async def chat(request: AdvisorRequest) -> AdvisorResponse:
    # Lazy-load knowledge base + FAISS on first request
    _load_knowledge_base()
    _load_faiss()

    if not _knowledge_base:
        raise HTTPException(
            status_code=503,
            detail=(
                "Knowledge base not loaded. "
                "Run build_knowledge_base.py to generate "
                "data/processed/skill_knowledge_base.json first."
            ),
        )

    # 1. Extract anchor skill from query
    anchor = _extract_anchor(request.message)

    # 2. Retrieve top-6 skill documents
    retrieved = _retrieve(request.message, anchor_skill=anchor, k=6)
    retrieved_skills = [r["doc"]["skill"] for r in retrieved]

    # 3. Build context block
    context = _build_context(retrieved)

    # 4. Assemble messages
    #    Keep last 8 turns of history to stay within context window
    history_messages = [
        {"role": m.role, "content": m.content}
        for m in request.history[-8:]
    ]

    # Inject retrieved context into the current user turn (matches notebook)
    current_message = {
        "role":    "user",
        "content": (
            f"Skill Intelligence Context:\n{context}\n\n"
            f"Career Question: {request.message}"
        ),
    }

    messages = history_messages + [current_message]

    # 5. Call OpenRouter
    reply = _call_openrouter(messages)

    # 6. Build skill reference cards for frontend
    skill_refs = []
    for r in retrieved:
        doc = r["doc"]
        skill_refs.append(SkillReference(
            skill=doc["skill"],
            ses_score=doc.get("ses_score"),
            ses_tier=doc.get("ses_tier"),
            archetype=doc.get("archetype"),
            forecast_trend=doc.get("forecast_trend"),
            forecast_1y=doc.get("forecast_1y"),
            forecast_3y=doc.get("forecast_3y"),
            sub_category=doc.get("sub_category"),
        ))

    return AdvisorResponse(
        reply=reply,
        retrieved_skills=retrieved_skills,
        skill_references=skill_refs,
        anchor_skill=anchor,
        query_type=_classify_query(request.message),
    )


@router.get("/status")
async def advisor_status():
    """Health check — reports knowledge base and FAISS availability."""
    _load_knowledge_base()
    _load_faiss()
    return {
        "knowledge_base_loaded": bool(_knowledge_base),
        "skill_count":           len(_knowledge_base),
        "faiss_available":       _faiss_available,
        "retriever":             "FAISS" if _faiss_available else "keyword",
        "model":                 OPENROUTER_MODEL,
        "openrouter_key_set":    bool(settings.OPENROUTER_API_KEY),
    }
