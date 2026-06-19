"""
SQLAlchemy ORM models for the SkillLens database.
Forecast table updated to match 11_Hybrid_Forecasting.ipynb output schema.
"""

from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    DateTime, ForeignKey, Text, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id            = Column(String, primary_key=True)          # slugified name
    name          = Column(String(200), nullable=False)
    category      = Column(String(100))
    subcategory   = Column(String(100))
    lifecycle     = Column(String(50))                        # Emerging/Stable/Legacy
    description   = Column(Text)

    # SES feature vector (all normalized 0–1)
    linkedin_demand    = Column(Float, default=0.0)
    salary_premium     = Column(Float, default=0.0)
    current_usage      = Column(Float, default=0.0)
    future_interest    = Column(Float, default=0.0)
    global_adoption    = Column(Float, default=0.0)
    growth_rate        = Column(Float, default=0.0)
    momentum_score     = Column(Float, default=0.0)
    volatility_score   = Column(Float, default=0.0)
    growth_consistency = Column(Float, default=0.0)
    cagr               = Column(Float, default=0.0)
    trend_slope        = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    history   = relationship("SkillHistory",       back_populates="skill", lazy="select")
    ses_score = relationship("SESScore",           back_populates="skill", uselist=False)
    cluster   = relationship("ClusterAssignment",  back_populates="skill", uselist=False)
    forecast  = relationship("Forecast",           back_populates="skill", uselist=False)

    __table_args__ = (
        Index("ix_skills_category", "category"),
        Index("ix_skills_lifecycle", "lifecycle"),
    )


class SkillHistory(Base):
    __tablename__ = "skill_history"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    skill_id      = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    year          = Column(Integer, nullable=False)
    demand        = Column(Integer, default=0)
    adoption_rate = Column(Float, default=0.0)
    survey_size   = Column(Integer, default=0)

    skill = relationship("Skill", back_populates="history")

    __table_args__ = (
        Index("ix_skill_history_skill_year", "skill_id", "year", unique=True),
    )


class SESScore(Base):
    __tablename__ = "ses_scores"

    skill_id       = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    ses_score      = Column(Float, nullable=False)
    ses_tier       = Column(String(50))              # Elite / Future-Proof / Stable / At-Risk / Extinction Risk
    feature_score  = Column(Float)
    forecast_score = Column(Float)
    cluster_score  = Column(Float)
    ses_delta_30d  = Column(Float, default=0.0)
    computed_at    = Column(DateTime(timezone=True), server_default=func.now())

    skill = relationship("Skill", back_populates="ses_score")

    __table_args__ = (
        Index("ix_ses_score", "ses_score"),
        Index("ix_ses_tier", "ses_tier"),
    )


class ClusterAssignment(Base):
    __tablename__ = "clusters"

    skill_id      = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    cluster_id    = Column(Integer, nullable=False)
    archetype     = Column(String(50))              # Future-Proof / Emerging / Stable / At-Risk / Obsolete
    pca_x         = Column(Float)
    pca_y         = Column(Float)
    silhouette    = Column(Float)
    centroid_dist = Column(Float)
    computed_at   = Column(DateTime(timezone=True), server_default=func.now())

    skill = relationship("Skill", back_populates="cluster")

    __table_args__ = (
        Index("ix_cluster_id", "cluster_id"),
        Index("ix_cluster_archetype", "archetype"),
    )


class Forecast(Base):
    """
    One row per skill.  Stores the hybrid forecast output produced by
    build_forecasts.py (11_Hybrid_Forecasting.ipynb architecture).

    forecast_1y / 2y / 3y  — raw demand predictions (count units)
    forecast_score_Ny       — MinMax-normalised per-horizon scores [0, 1]
    forecast_score          — composite: 0.25×1y + 0.35×2y + 0.40×3y
    forecast_method         — Holt | ExponentialSmoothing | FeatureBased
    forecast_trend          — Explosive | Growing | Stable | Declining
    confidence              — model confidence [0, 1]
    history_length          — number of annual data points used
    """
    __tablename__ = "forecasts"

    skill_id         = Column(String, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)

    # Raw demand forecasts
    forecast_1y      = Column(Float)
    forecast_2y      = Column(Float)
    forecast_3y      = Column(Float)

    # Normalised intelligence scores
    forecast_score_1y = Column(Float)
    forecast_score_2y = Column(Float)
    forecast_score_3y = Column(Float)
    forecast_score    = Column(Float)       # composite — used by SES engine

    # Metadata
    forecast_method  = Column(String(30))   # Holt | ExponentialSmoothing | FeatureBased
    forecast_trend   = Column(String(20))   # Explosive | Growing | Stable | Declining
    confidence       = Column(Float)
    history_length   = Column(Integer)

    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    skill = relationship("Skill", back_populates="forecast")

    __table_args__ = (
        Index("ix_forecasts_method", "forecast_method"),
        Index("ix_forecasts_trend",  "forecast_trend"),
        Index("ix_forecasts_score",  "forecast_score"),
    )


class Industry(Base):
    __tablename__ = "industries"

    id              = Column(String, primary_key=True)
    name            = Column(String(200), nullable=False)
    icon            = Column(String(10))
    growth_rate     = Column(Float)
    hiring_index    = Column(Float)
    avg_ses         = Column(Float)
    extinction_risk = Column(Float)
    forecast        = Column(String(50))    # Explosive / Strong / Stable / Contracting
    top_skills      = Column(JSON)          # list[str]
    skill_count     = Column(Integer)


class CareerPath(Base):
    __tablename__ = "career_paths"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    role_from       = Column(String(200), nullable=False)
    role_to         = Column(String(200), nullable=False)
    required_skills = Column(JSON)          # list[str]
    avg_timeline_wk = Column(Integer)
    ses_improvement = Column(Float)
    difficulty      = Column(String(50))
