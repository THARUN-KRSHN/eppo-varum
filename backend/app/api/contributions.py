import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

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
        connection.execute("""CREATE TABLE IF NOT EXISTS manual_routes (
            id TEXT PRIMARY KEY, submitted_by TEXT NOT NULL, username TEXT NOT NULL,
            location_name TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
            origin TEXT NOT NULL, destination TEXT NOT NULL, departure_time TEXT NOT NULL,
            status TEXT NOT NULL, submitted_at TEXT NOT NULL
        )""")


class ContributionCreate(BaseModel):
    document_id: str


class ManualRouteCreate(BaseModel):
    location_name: str = Field(min_length=2, max_length=200)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    origin: str = Field(min_length=2, max_length=120)
    destination: str = Field(min_length=2, max_length=120)
    departure_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


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


@router.post("/manual-route")
def create_manual_route(payload: ManualRouteCreate, user: dict = Depends(current_user)):
    initialize()
    route_id = f"manual-{uuid.uuid4()}"
    submitted_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(db_path()) as connection:
        connection.execute("""INSERT INTO manual_routes
            (id, submitted_by, username, location_name, lat, lng, origin, destination, departure_time, status, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?)""", (
                route_id, user["id"], user["username"], payload.location_name.strip(), payload.lat, payload.lng,
                payload.origin.strip(), payload.destination.strip(), payload.departure_time, submitted_at,
            ))
    return {"success": True, "data": {"id": route_id, **payload.model_dump(), "username": user["username"], "status": "PUBLISHED", "submitted_at": submitted_at}}


@router.get("/manual-routes/public")
def public_manual_routes():
    initialize()
    with sqlite3.connect(db_path()) as connection:
        rows = connection.execute("""SELECT id, username, location_name, lat, lng, origin, destination,
            departure_time, status, submitted_at FROM manual_routes WHERE status = 'PUBLISHED' ORDER BY submitted_at DESC""").fetchall()
    fields = ("id", "username", "location_name", "lat", "lng", "origin", "destination", "departure_time", "status", "submitted_at")
    return {"success": True, "data": [dict(zip(fields, row)) for row in rows]}
