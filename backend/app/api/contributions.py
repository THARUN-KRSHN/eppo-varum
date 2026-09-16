import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..services.auth_service import current_user
from ..services.document_store import documents
from ..core.config import DATABASE_PATH

router = APIRouter(prefix="/contributions", tags=["contributions"])


def db_path():
    from pathlib import Path
    path = Path(DATABASE_PATH)
    return path if path.is_absolute() else Path(__file__).resolve().parents[3] / path


def initialize():
    with sqlite3.connect(db_path()) as connection:
        connection.execute("CREATE TABLE IF NOT EXISTS contributions (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, submitted_by TEXT NOT NULL, username TEXT NOT NULL, status TEXT NOT NULL, submitted_at TEXT NOT NULL, reviewed_at TEXT)")


class ContributionCreate(BaseModel):
    document_id: str


@router.post("")
def create(payload: ContributionCreate, user: dict = Depends(current_user)):
    initialize(); document = documents.get(payload.document_id)
    if not document or document.get("uploaded_by") != user["id"]:
        raise HTTPException(404, "Document not found.")
    if not document.get("extraction"):
        raise HTTPException(409, "Complete verification before submitting this contribution.")
    contribution = (str(uuid.uuid4()), payload.document_id, user["id"], user["username"], "SUBMITTED", datetime.now(timezone.utc).isoformat())
    with sqlite3.connect(db_path()) as connection:
        connection.execute("INSERT INTO contributions (id, document_id, submitted_by, username, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?)", contribution)
    return {"success": True, "data": {"id": contribution[0], "document_id": payload.document_id, "username": user["username"], "status": "SUBMITTED"}}


@router.get("")
def list_contributions(user: dict = Depends(current_user)):
    initialize()
    with sqlite3.connect(db_path()) as connection:
        rows = connection.execute("SELECT id, document_id, username, status, submitted_at FROM contributions WHERE submitted_by = ? ORDER BY submitted_at DESC", (user["id"],)).fetchall()
    return {"success": True, "data": [dict(zip(("id", "document_id", "username", "status", "submitted_at"), row)) for row in rows]}


@router.get("/public")
def public_contributions():
    initialize()
    with sqlite3.connect(db_path()) as connection:
        rows = connection.execute("SELECT id, document_id, username, status, submitted_at FROM contributions WHERE status = 'APPROVED' ORDER BY submitted_at DESC").fetchall()
    return {"success": True, "data": [dict(zip(("id", "document_id", "username", "status", "submitted_at"), row)) for row in rows]}
