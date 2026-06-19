from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SkillLens AI"
    VERSION:  str = "4.0.0"
    DEBUG:    bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://skilllens:skilllens@localhost:5432/skilllens"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM:  str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24   # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "https://skilllens.vercel.app",
    ]

    # ── LLM ──────────────────────────────────────────────────────────────────
    # Career Advisor uses OpenRouter (openai/gpt-oss-120b:free)
    # matching 14_Career_Advisor.ipynb
    OPENROUTER_API_KEY:  str = ""
    OPENROUTER_MODEL:    str = "openai/gpt-oss-120b:free"
    OPENROUTER_URL:      str = "https://openrouter.ai/api/v1/chat/completions"

    # Kept for optional future use (e.g. switching LLM backend)
    ANTHROPIC_API_KEY:   str = ""

    # ── Data paths ────────────────────────────────────────────────────────────
    DATA_DIR:       str = "data/processed"
    SKILLS_CSV:     str = "data/processed/expanded_skill_master.csv"
    SES_CSV:        str = "data/processed/ses_rankings.csv"
    CLUSTERS_CSV:   str = "data/processed/cluster_assignments.csv"
    FORECASTS_CSV:  str = "data/processed/forecast_results.csv"
    HISTORY_CSV:    str = "data/processed/skill_demand_history_clean.csv"
    INDUSTRY_CSV:   str = "data/processed/industry_analytics.csv"

    # Career Advisor knowledge base (built by build_knowledge_base.py)
    KB_PATH:        str = "data/processed/skill_knowledge_base.json"
    FAISS_PATH:     str = "data/processed/faiss_index.bin"
    FAISS_META_PATH: str = "data/processed/faiss_metadata.json"

    # ── ML config ─────────────────────────────────────────────────────────────
    FORECAST_HORIZONS: List[int] = [1, 2, 3]   # years (hybrid forecaster)
    N_CLUSTERS:        int       = 5
    SES_FEATURE_WEIGHT:  float   = 0.40
    SES_FORECAST_WEIGHT: float   = 0.35
    SES_CLUSTER_WEIGHT:  float   = 0.25

    class Config:
        env_file = ".env"
        extra    = "ignore"


settings = Settings()
