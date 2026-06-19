-- SkillLens AI v4 — PostgreSQL Schema
-- Forecasts table updated for 11_Hybrid_Forecasting.ipynb output (one row per skill).
-- Run via Alembic or directly: psql -U skilllens -d skilllens -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fast ILIKE search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- JSON indexing

-- ── Skills ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
    id                  VARCHAR(200) PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    category            VARCHAR(100),
    subcategory         VARCHAR(100),
    lifecycle           VARCHAR(50),          -- Emerging / Stable / Legacy
    description         TEXT,

    -- Feature vector (normalised 0–1)
    linkedin_demand     FLOAT DEFAULT 0.0,
    salary_premium      FLOAT DEFAULT 0.0,
    current_usage       FLOAT DEFAULT 0.0,
    future_interest     FLOAT DEFAULT 0.0,
    global_adoption     FLOAT DEFAULT 0.0,
    growth_rate         FLOAT DEFAULT 0.0,
    momentum_score      FLOAT DEFAULT 0.0,
    volatility_score    FLOAT DEFAULT 0.0,
    growth_consistency  FLOAT DEFAULT 0.0,
    cagr                FLOAT DEFAULT 0.0,
    trend_slope         FLOAT DEFAULT 0.0,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_skills_name_trgm ON skills USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_skills_category  ON skills (category);
CREATE INDEX IF NOT EXISTS ix_skills_lifecycle ON skills (lifecycle);


-- ── Skill History ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_history (
    id            SERIAL PRIMARY KEY,
    skill_id      VARCHAR(200) NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    year          INTEGER NOT NULL,
    demand        INTEGER DEFAULT 0,
    adoption_rate FLOAT   DEFAULT 0.0,
    survey_size   INTEGER DEFAULT 0,
    UNIQUE (skill_id, year)
);

CREATE INDEX IF NOT EXISTS ix_skill_history_skill ON skill_history (skill_id);
CREATE INDEX IF NOT EXISTS ix_skill_history_year  ON skill_history (year);


-- ── Clusters ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clusters (
    skill_id      VARCHAR(200) PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    cluster_id    INTEGER NOT NULL,
    archetype     VARCHAR(50),   -- Future-Proof / Emerging / Stable / At-Risk / Obsolete
    pca_x         FLOAT,
    pca_y         FLOAT,
    silhouette    FLOAT,
    centroid_dist FLOAT,
    computed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_clusters_cluster_id ON clusters (cluster_id);
CREATE INDEX IF NOT EXISTS ix_clusters_archetype  ON clusters (archetype);


-- ── SES Scores ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ses_scores (
    skill_id        VARCHAR(200) PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,
    ses_score       FLOAT NOT NULL,
    ses_tier        VARCHAR(50),   -- Elite / Future-Proof / Stable / At-Risk / Extinction Risk
    feature_score   FLOAT,
    forecast_score  FLOAT,         -- sourced from forecasts.forecast_score
    cluster_score   FLOAT,
    ses_delta_30d   FLOAT DEFAULT 0.0,
    computed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ses_score ON ses_scores (ses_score DESC);
CREATE INDEX IF NOT EXISTS ix_ses_tier  ON ses_scores (ses_tier);


-- ── Forecasts (one row per skill) ─────────────────────────────────────────────
-- Matches 11_Hybrid_Forecasting.ipynb output schema.
-- Tiered strategy:
--   ≥10 years history  →  forecast_method = 'Holt'
--   7–9 years          →  forecast_method = 'ExponentialSmoothing'
--   <7 years           →  forecast_method = 'FeatureBased'

CREATE TABLE IF NOT EXISTS forecasts (
    skill_id          VARCHAR(200) PRIMARY KEY REFERENCES skills(id) ON DELETE CASCADE,

    -- Raw demand forecasts (count units, same scale as skill_history.demand)
    forecast_1y       FLOAT,    -- 1-year ahead
    forecast_2y       FLOAT,    -- 2-year ahead
    forecast_3y       FLOAT,    -- 3-year ahead

    -- MinMax-normalised intelligence scores [0, 1]
    forecast_score_1y FLOAT,
    forecast_score_2y FLOAT,
    forecast_score_3y FLOAT,

    -- Composite: 0.25×score_1y + 0.35×score_2y + 0.40×score_3y
    -- This is the value consumed by the SES engine as ForecastScore.
    forecast_score    FLOAT,

    -- Metadata
    forecast_method   VARCHAR(30),  -- Holt | ExponentialSmoothing | FeatureBased
    forecast_trend    VARCHAR(20),  -- Explosive | Growing | Stable | Declining
    confidence        FLOAT,        -- model confidence [0, 1]
    history_length    INTEGER,      -- number of annual data points available

    computed_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_forecasts_method ON forecasts (forecast_method);
CREATE INDEX IF NOT EXISTS ix_forecasts_trend  ON forecasts (forecast_trend);
CREATE INDEX IF NOT EXISTS ix_forecasts_score  ON forecasts (forecast_score DESC);


-- ── Industries ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS industries (
    id              VARCHAR(100) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    icon            VARCHAR(10),
    growth_rate     FLOAT,
    hiring_index    FLOAT,
    avg_ses         FLOAT,
    extinction_risk FLOAT,
    forecast        VARCHAR(50),  -- Explosive / Strong / Stable / Contracting
    top_skills      JSONB,
    skill_count     INTEGER
);


-- ── Career Paths ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_paths (
    id              SERIAL PRIMARY KEY,
    role_from       VARCHAR(200) NOT NULL,
    role_to         VARCHAR(200) NOT NULL,
    required_skills JSONB,
    avg_timeline_wk INTEGER,
    ses_improvement FLOAT,
    difficulty      VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS ix_career_paths_from ON career_paths (role_from);
CREATE INDEX IF NOT EXISTS ix_career_paths_to   ON career_paths (role_to);


-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_skills_updated_at ON skills;
CREATE TRIGGER trg_skills_updated_at
    BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
