# SkillLens AI

SkillLens AI is an AI-powered workforce intelligence platform built around the Human Skill Extinction Predictor (HSEP) methodology. It helps users understand which technical skills are future-ready, which skills need caution, how industries are evolving, and what tools or skills fit a specific career goal.

The project combines processed workforce datasets, skill-demand history, salary signals, global adoption, clustering, forecasting, explainability, downloadable reports, and a grounded career advisor into one interactive React + FastAPI application.

## What This Project Does

SkillLens AI answers three practical questions:

```text
Which skills are growing?
Which skills are losing relevance or need review?
What should someone learn next for a role, goal, or industry?
```

Instead of ranking skills from one source, the system combines multiple signals:

- LinkedIn-style demand indicators
- Salary value signals
- Developer adoption and future-interest signals
- Global adoption scores
- Historical demand trends
- Forecasted 1-year, 2-year, and 3-year outlooks
- K-Means skill archetypes
- SES score and risk/safety tiers
- Industry-level skill mapping
- Career-advisor knowledge-base retrieval

The app is designed as a portfolio-grade analytics product: a cinematic landing page, a dashboard, a skill explorer, forecasts, industry analytics, a recommendation system, a career advisor, global demand views, reports, feedback, and a methodology page explaining the HSEP pipeline.

## Current Data Snapshot

The repository includes processed project datasets under `backend/data/processed`.

Current validated snapshot:

- 95 canonical skills
- 95 raw skill rows in the current SES snapshot
- 0 merged skill-alias rows in the current replacement snapshot
- 2,179 canonical skill-year history rows
- 2,179 raw history rows in the current replacement snapshot
- 0 history alias rows collapsed in the current replacement snapshot
- 8 industry analytics groups
- 6 PowerPoint report exports in `backend/data/Reports`

The app can run in CSV snapshot mode, so the frontend remains usable even when a live database is not available.

## Main Features

### Landing Page

- Fullscreen cinematic hero section
- Looping video background with fallback styling
- Glassmorphic navigation and call-to-action buttons
- Smooth visual transition into the inner analytics app
- Feature strip for Skill Explorer, Career Advisor, and Forecasts

### Workforce Intelligence Dashboard

- KPI cards for tracked skills, industries, source records, forecast confidence, average safety, and future-ready skills
- Historical demand index with 3-year projection
- Salary value signals for selected AI/data skills
- Skills-by-category breakdown
- SES score distribution histogram with axis labels and interpretation
- Rising skills and skills-to-review panels
- Skill signal map showing SES, demand, and salary value together
- Future-proof leaderboard with confidence and forecast method context

### Skills Guide

- Overview page explaining the skill universe
- Search and category filtering
- Skill rows with category, SES score, and forecast status
- Dataset-backed guide content instead of only static marketing text

### Skill Explorer

- Searchable and filterable skill database
- Core columns: skill, category, SES score, archetype, forecast trend, demand, salary value, and risk tier
- Skill comparison workflow
- Selected-skill detail panel
- Overview, forecast, salary, related-skill, and roadmap/action context
- "Why this SES score?" explainability section
- Save/watchlist-style user interactions
- Export and advisor handoff actions

### Forecasts

- Forecast KPI cards styled consistently with the overview dashboard
- 1-year, 2-year, and 3-year forecast values
- Expected growth and confidence signals
- Forecast method distribution
- Trend filters for explosive, growing, stable, and declining skills
- Confidence-band explanation for uncertainty-aware forecasts

### Industries

- Industry-level analytics by category/domain
- Industry list with average SES, forecast trend, top skill, and risk context
- Detail panel for the selected industry
- Industry skill network visualization
- Skill-node sizing based on demand or relevance
- Industry risk exposure and archetype distribution views
- Cross-industry comparison support

### Goal-Based Skill Recommender

The recommender replaces generic roadmaps with requirement-based skill/tool suggestions.

Example:

```text
Goal: Data Analyst
Recommended: SQL, Excel, Python, Power BI, Tableau
Reason: SQL supports querying, Excel supports fast analysis, Python supports automation, and BI tools support dashboards.
```

This keeps the product from recommending one common tool for every use case. Recommendations are meant to explain why a skill fits a particular role, requirement, or learning goal.

### Career Advisor

- Chat-style AI advisor interface
- Quick prompts based on workforce intelligence
- Grounded responses using local HSEP data
- Skill chips and references
- Context-aware suggestions such as next skills, risky skills, or role-fit comparisons
- Optional OpenRouter integration through environment variables

### Global Demand

- Regional demand, growth, risk, and salary indicators
- Global demand visualizations
- Skill-network visualization with fallback handling
- Regional skill context for broader workforce analysis

### Reports Center

Downloadable project report exports are stored in:

```text
backend/data/Reports
```

Included reports:

- Skill Forecast Export
- Industry Analytics Export
- Salary Signal Export
- Risk and SES Export
- Regional Demand Export
- Career Advisor Notes

### Methodology

The Methodology page explains the HSEP pipeline as a product-facing flowchart with:

- Node heading
- Description
- Input
- Output
- Notebook or dataset evidence
- Formula sections
- Plotly charts where useful

It covers:

1. Data collection
2. Data cleaning and normalization
3. Skill universe expansion
4. Skill classification and taxonomy
5. Workforce feature engineering
6. Temporal skill intelligence
7. Skill archetype discovery
8. Hybrid forecasting
9. Forecast outputs
10. SES computation
11. Industry analytics
12. Skill ranking by industry
13. Career recommendation research
14. AI career advisor methodology
15. Explainability
16. Website output
17. Limitations
18. Final methodology summary

## HSEP Scoring Summary

The Skill Extinction Score (SES) combines feature intelligence, forecast intelligence, and cluster intelligence.

```text
SES =
0.40 x Feature Intelligence
+
0.35 x Forecast Intelligence
+
0.25 x Cluster Intelligence
```

Feature Intelligence combines:

```text
0.25 x LinkedIn Demand
+ 0.20 x Salary Premium
+ 0.20 x Current Usage
+ 0.20 x Future Interest
+ 0.10 x Global Adoption Score
+ 0.05 x Growth Rate
```

Forecast Intelligence adjusts forecast scores by confidence:

```text
Forecast Intelligence =
Confidence x Forecast Score + (1 - Confidence) x 0.50
```

Cluster Intelligence maps discovered archetypes:

```text
Future-Proof -> 0.90
Growing      -> 0.70
Stable       -> 0.50
High-Risk    -> 0.30
```

The goal is not to predict absolute extinction. The goal is to estimate future workforce relevance and make the reasoning understandable.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Framer Motion
- Recharts
- Plotly via `react-plotly.js`
- Three.js / React Three Fiber
- Zustand
- Radix UI primitives
- Lucide React icons

### Backend

- FastAPI
- Python
- Pydantic-style typed API responses
- CSV-backed analytics services
- Optional PostgreSQL support
- Alembic migrations
- RAG-style career advisor data assets
- OpenRouter-compatible advisor configuration through environment variables

### Data and Analytics

- Pandas-style processed CSV pipeline
- K-Means clustering outputs
- Forecast result tables
- Skill taxonomy dictionary
- Skill knowledge base JSON
- Global adoption tables
- Industry skill maps
- Report-generation outputs

### Deployment

- Docker
- Docker Compose
- Nginx frontend container
- Vercel static frontend support
- FastAPI backend container support

## Repository Layout

```text
skilllens-final/
  backend/
    core/                 Backend configuration
    data/
      processed/          Processed HSEP CSV, JSON, vector, and chart outputs
      raw/                Raw-data placeholder folder
      Reports/            Downloadable PowerPoint report exports
    database/             Database helpers
    models/               Backend models
    pipelines/            Data rebuild and validation scripts
    routers/              FastAPI route modules
    main.py               FastAPI app entry point
    requirements.txt      Python dependencies

  frontend/
    public/               Static frontend assets
    src/
      components/         Layout, UI, chart, and reusable components
      data/               Frontend fallback and methodology evidence data
      pages/              App pages and route screens
      services/           API client
      store/              Client-side app state
    package.json          Frontend dependencies and scripts
    vite.config.ts        Vite configuration
    vercel.json           Vercel SPA routing support

  tools/                  Utility scripts
  docker-compose.yml      Full-stack local deployment
  vercel.json             Root Vercel routing config
  .env.example            Safe environment variable template
  README.md               Project documentation
```

## Running Locally

### 1. Backend

From the repository root:

```powershell
Copy-Item .env.example backend/.env
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend URL:

```text
http://localhost:8000
```

The backend can serve processed CSV-backed data even if PostgreSQL is not running.

### 2. Frontend

Open a new terminal:

```powershell
cd frontend
npm install
Set-Content .env.local 'VITE_API_URL=http://localhost:8000'
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

If you see this error:

```text
'vite' is not recognized as an internal or external command
```

run:

```powershell
npm install
```

Then run:

```powershell
npm run dev
```

## Building for Production

Frontend build:

```powershell
cd frontend
npm install
npm run build
```

Backend sanity check:

```powershell
cd backend
python -m compileall .
```

## Docker Compose

Create a root `.env` from `.env.example`, set production-safe values, then run:

```bash
docker compose up --build
```

Default local services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

Optional pipeline rebuild:

```bash
docker compose --profile pipeline up pipeline
```

## Rebuilding Processed Data

The processed data pipeline is in `backend/pipelines`.

Typical rebuild order:

```powershell
cd backend
python pipelines/build_clusters.py
python pipelines/build_forecasts.py
python pipelines/build_ses.py
python pipelines/build_industry_analytics.py
python pipelines/build_knowledge_base.py
python pipelines/validate_data.py
python pipelines/generate_frontend_fallback.py
```

The validation step is important because it checks for:

- unresolved aliases
- invalid score ranges
- incomplete forecast horizons
- mismatched skill joins
- missing canonical skill identifiers
- data consistency issues before frontend fallback generation

## Deployment Notes

### Frontend on Vercel

Deploy the `frontend` folder or use the root-level deployment configuration depending on your Vercel project setup.

Set:

```text
VITE_API_URL=https://your-backend-url.example.com
```

The included Vercel config supports React Router deep links.

### Backend

Deploy `backend` as a Python/FastAPI service or Docker container.

Recommended environment variables:

```text
DATABASE_URL
SECRET_KEY
CORS_ORIGINS
OPENROUTER_API_KEY
```

Keep real keys in local or hosted environment variables. Do not commit `.env` files.

## Environment Variables

Use `.env.example` as the template.

Important notes:

- `.env`, `backend/.env`, and `frontend/.env.local` should stay local.
- `OPENROUTER_API_KEY` is optional unless using live advisor generation.
- The frontend uses `VITE_API_URL` to reach the backend.
- The backend can fall back to CSV-backed data when database access is unavailable.

## Data Quality and Aliasing

The project includes alias cleanup for common skill naming issues.

Examples:

```text
nodejs -> node.js
powerbi -> power bi
ms excel -> excel
microsoft excel -> excel
amazon web services -> aws
google cloud platform -> google cloud
cyber security -> cybersecurity
```

Some broad umbrella terms, such as `database`, `databases`, `database management`, `programming`, and `coding`, are treated carefully in the UI because they may represent noisy labels rather than precise learnable skills.

## Known Limitations

- LinkedIn-style demand signals are snapshot-based.
- Salary values are normalized signals, not literal salary predictions.
- Emerging skills may have limited historical coverage.
- Forecasts are estimates, not absolute truths.
- Some skill names require continued alias refinement.
- CSV snapshot mode is useful for demos, but production deployments should use a stable backend and database.
- Large visualization libraries such as Plotly and Three.js can increase frontend bundle size.

## Improvement Roadmap

Future improvements that would make the platform stronger:

- More complete alias-resolution review for broad umbrella terms
- Better validation for whether a low SES score means weak data coverage or true decline
- Persistent user accounts for saved skills and feedback
- Streaming AI advisor responses
- More detailed source-grounding in advisor answers
- Stronger mobile layouts for dense analytic tables
- More forecast uncertainty explanations for non-technical users
- Expanded industry-level skill graphs
- Automated report generation from the latest processed datasets
- CI workflow for frontend build, backend validation, and data-quality checks

## GitHub Readiness Checklist

Before pushing:

- Keep `.env` files out of Git.
- Keep `node_modules`, `dist`, generated logs, and local cache files out of Git.
- Verify `frontend/package-lock.json` is committed.
- Verify `backend/data/processed` files are intentionally included.
- Verify `backend/data/Reports` files are intentionally included.
- Run `npm run build` from `frontend`.
- Run backend validation or at least `python -m compileall .` from `backend`.
- Rotate any API key that was ever exposed in source or chat.

## Project Summary

SkillLens AI turns raw workforce and technology signals into an explainable career intelligence product. It combines skill scoring, forecasting, clustering, industry analytics, recommendations, reports, and AI-assisted guidance so users can understand what to learn, what to monitor, and how different skills fit future work.
