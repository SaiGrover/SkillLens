# SkillLens AI

SkillLens AI is a workforce intelligence application built around the Human Skill Extinction Predictor (HSEP) dataset. It combines skill safety scores, demand signals, forecasts, industries, roadmaps, reports, and a data-grounded career advisor.

## Repository layout

```text
frontend/              React, Vite, TypeScript application
backend/               FastAPI service and processed HSEP datasets
backend/data/Reports/  Project PowerPoint report exports
docker-compose.yml     Local full-stack deployment
.env.example           Safe environment-variable template
```

## Before you push to GitHub

1. Copy `.env.example` to `backend/.env` for local backend development.
2. Set a real `SECRET_KEY` and, if required, `OPENROUTER_API_KEY` only in local or deployment environment variables.
3. Do not commit `.env`, `node_modules`, `dist`, generated logs, or `output`. They are covered by `.gitignore`.
4. The processed CSV datasets and `backend/data/Reports` PowerPoint files are intentionally kept in the project because the application uses them.

If a provider key was ever committed previously, revoke and rotate it in that provider before publishing the repository.

## Local development

### Backend

```powershell
Copy-Item .env.example backend/.env
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API stays available in CSV snapshot mode when PostgreSQL is not running, so the frontend can continue to use the processed project data.

### Frontend

```powershell
cd frontend
npm ci
Set-Content .env.local 'VITE_API_URL=http://localhost:8000'
npm run dev
```

Open `http://localhost:5173`.

## Docker deployment

Create a root `.env` from `.env.example`, set the production secrets, then run:

```bash
docker compose up --build
```

The frontend is served at `http://localhost:5173`. Its Nginx layer forwards `/api` requests to the backend container. PostgreSQL is available on port `5432` and the API on port `8000`.

Run the optional data pipeline only when rebuilding processed outputs:

```bash
docker compose --profile pipeline up pipeline
```

## Hosted deployment

- **Frontend:** Deploy the `frontend` directory to Vercel, Netlify, or any static host. Set `VITE_API_URL` to the public FastAPI URL at build time.
- **Backend:** Deploy the `backend` directory as a Docker service. Set `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`, and optional `OPENROUTER_API_KEY` as host-managed secrets.
- **Database:** Use a managed PostgreSQL service or the compose `postgres` service for self-hosting.

The included `frontend/vercel.json` supports React Router deep links.

## Validation

```powershell
cd frontend
npm run build
```

The app uses processed project CSVs in `backend/data/processed`. The Reports Center serves the supplied PowerPoint exports from `backend/data/Reports`.
