import sqlite3
import uuid
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from ..core.config import DATABASE_PATH

router = APIRouter(prefix="/notifications", tags=["notifications"])


class Subscription(BaseModel):
	stop_id: str
	route: str | None = None
	advance_minutes: int = 30


def database_path() -> Path:
	path = Path(DATABASE_PATH)
	return path if path.is_absolute() else Path(__file__).resolve().parents[3] / path
@router.post("/subscriptions")
def create(subscription: Subscription):
	subscription_id = str(uuid.uuid4())
	with sqlite3.connect(database_path()) as connection:
		connection.execute("CREATE TABLE IF NOT EXISTS notification_subscriptions (id TEXT PRIMARY KEY, stop_id TEXT NOT NULL, route TEXT, advance_minutes INTEGER NOT NULL, created_at TEXT NOT NULL)")
		connection.execute("INSERT INTO notification_subscriptions VALUES (?, ?, ?, ?, datetime('now'))", (subscription_id, subscription.stop_id, subscription.route, subscription.advance_minutes))
	return {"id": subscription_id, "enabled": True, "subscription": subscription.model_dump()}
@router.post("/demo-trigger")
def demo(subscription: Subscription):
	return {"type": "SCHEDULED", "title": "Bus arriving soon", "message": "Your bus is scheduled at this stop in approximately 30 minutes.", "scheduled_time": "07:20", "demo": True}
