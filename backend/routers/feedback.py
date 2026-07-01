import csv
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from core.config import settings

router = APIRouter()

FEEDBACK_DIR = Path(__file__).resolve().parents[1] / "data" / "private"
FEEDBACK_FILE = FEEDBACK_DIR / "feedback.csv"
CSV_FIELDS = ["id", "created_at", "name", "role", "rating", "category", "message"]


class FeedbackIn(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    rating: int = Field(ge=1, le=10)
    category: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=4000)


def admin_password() -> str:
    password = settings.FEEDBACK_REVIEW_PASSWORD.strip()
    if not password:
        raise HTTPException(
            status_code=503,
            detail="Feedback review is disabled until FEEDBACK_REVIEW_PASSWORD is configured.",
        )
    return password


def require_admin(x_feedback_password: str | None) -> None:
    if not x_feedback_password or x_feedback_password != admin_password():
        raise HTTPException(status_code=401, detail="Feedback review password is required.")


def ensure_file() -> None:
    FEEDBACK_DIR.mkdir(parents=True, exist_ok=True)
    if not FEEDBACK_FILE.exists():
        with FEEDBACK_FILE.open("w", newline="", encoding="utf-8") as handle:
            csv.DictWriter(handle, fieldnames=CSV_FIELDS).writeheader()


@router.post("")
async def submit_feedback(payload: FeedbackIn):
    ensure_file()
    row = {
        "id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "name": (payload.name or "Anonymous reviewer").strip() or "Anonymous reviewer",
        "role": (payload.role or "Project reviewer").strip() or "Project reviewer",
        "rating": str(payload.rating),
        "category": payload.category.strip(),
        "message": payload.message.strip(),
    }
    with FEEDBACK_FILE.open("a", newline="", encoding="utf-8") as handle:
        csv.DictWriter(handle, fieldnames=CSV_FIELDS).writerow(row)
    return {"status": "saved", "id": row["id"]}


@router.get("/export.csv", response_class=PlainTextResponse)
async def export_feedback_csv(x_feedback_password: str | None = Header(default=None)):
    require_admin(x_feedback_password)
    ensure_file()
    return PlainTextResponse(
        FEEDBACK_FILE.read_text(encoding="utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skilllens-feedback.csv"},
    )


@router.delete("")
async def clear_feedback(x_feedback_password: str | None = Header(default=None)):
    require_admin(x_feedback_password)
    if FEEDBACK_FILE.exists():
        FEEDBACK_FILE.unlink()
    ensure_file()
    return {"status": "cleared"}
