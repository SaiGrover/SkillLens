
"""
career_advisor.py â€” HSEP Career Advisor (importable module)
Usage:
    from career_advisor import career_advisor
    result = career_advisor("Should I learn Kubernetes?")
    print(result["answer"])
"""
import json, numpy as np, urllib.request

KB_PATH   = "skill_knowledge_base.json"
META_PATH = "faiss_metadata.json"

with open(KB_PATH) as f:
    knowledge_base = json.load(f)
KB_INDEX = {d["skill"]: d for d in knowledge_base}

try:
    import faiss
    FAISS_INDEX = faiss.read_index("faiss_index.bin")
    with open(META_PATH) as f:
        FAISS_META = json.load(f)
    FAISS_AVAILABLE = True
except Exception:
    FAISS_AVAILABLE = False

VECTOR_COLS = [
    "linkedin_demand","salary_premium","current_usage",
    "future_interest","growth_rate","global_adoption","ses_score",
]

SYSTEM_PROMPT = (
    "You are HSEP Career Advisor â€” a precise, data-driven career "
    "intelligence assistant. Ground every recommendation in the provided "
    "skill context. Cite SES scores, tiers, and forecast trends when relevant."
)

OPENROUTER_API_KEY = "REDACTED_OPENROUTER_API_KEY"
OPENROUTER_MODEL   = "openai/gpt-oss-120b:free"
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"

def _keyword_retrieve(query, k=6):
    tokens = set(query.lower().split())
    scored = []
    for doc in knowledge_base:
        text  = f"{doc['skill']} {doc.get('sub_category','')} {doc.get('narrative','')}".lower()
        score = sum(1 for t in tokens if t in text) + (10 if doc["skill"] in query.lower() else 0)
        if score > 0:
            scored.append((score, doc))
    scored.sort(key=lambda x: -x[0])
    return [{"score": s, "doc": d} for s, d in scored[:k]]

def _faiss_retrieve(anchor, k=6):
    if anchor not in KB_INDEX:
        return []
    doc = KB_INDEX[anchor]
    vec = np.array([[doc.get(c, 0.0) or 0.0 for c in VECTOR_COLS]], dtype=np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0: vec /= norm
    D, I = FAISS_INDEX.search(vec, k)
    return [{"score": float(d), "doc": KB_INDEX[FAISS_META[i]["skill"]]}
            for d, i in zip(D[0], I[0]) if FAISS_META[i]["skill"] in KB_INDEX]

def _build_context(retrieved):
    lines = []
    for item in retrieved:
        d = item["doc"]
        lines.append(
            f"SKILL: {d['skill'].title()}
"
            f"  SES: {d.get('ses_score','?')} ({d.get('ses_tier','?')}) | "
            f"Archetype: {d.get('archetype','?')} | "
            f"Trend: {d.get('forecast_trend','?')}
"
            f"  {d.get('narrative','')[:200]}
"
        )
    return "
".join(lines)

def career_advisor(query: str) -> dict:
    anchor    = next((d["skill"] for d in knowledge_base if d["skill"] in query.lower()), None)
    retrieved = (_faiss_retrieve(anchor) if FAISS_AVAILABLE and anchor
                 else _keyword_retrieve(query))
    context   = _build_context(retrieved)

    oai_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"Context:
{context}

Question: {query}"},
    ]
    payload = json.dumps({
        "model"     : OPENROUTER_MODEL,
        "max_tokens": 1000,
        "messages"  : oai_messages,
    }).encode()
    req = urllib.request.Request(
        OPENROUTER_URL, data=payload, method="POST",
        headers={
            "Content-Type" : "application/json",
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer" : "https://hsep.app",
            "X-Title"      : "HSEP Career Advisor",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body   = json.loads(resp.read())
            answer = body["choices"][0]["message"]["content"]
    except Exception as e:
        answer = f"[API error: {e}]"
    return {"query": query,
            "retrieved_skills": [r["doc"]["skill"] for r in retrieved],
            "answer": answer}
