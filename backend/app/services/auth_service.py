import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from fastapi import Depends, Header, HTTPException

from ..core.config import AUTH_SECRET, DATABASE_PATH, SUPABASE_ANON_KEY, SUPABASE_AUTH_ENABLED, SUPABASE_URL

SECRET = AUTH_SECRET


def _db_path() -> Path:
    path = Path(DATABASE_PATH)
    return path if path.is_absolute() else Path(__file__).resolve().parents[3] / path


def initialize_users() -> None:
    path = _db_path(); path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)")


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, digest = stored.split("$", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 210_000).hex()
    return hmac.compare_digest(candidate, digest)


def issue_token(user: dict) -> str:
    payload = {"sub": user["id"], "username": user["username"], "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def local_user(user_id: str) -> dict | None:
    initialize_users()
    with sqlite3.connect(_db_path()) as connection:
        row = connection.execute("SELECT id, username, email, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"id": row[0], "username": row[1], "email": row[2], "created_at": row[3]} if row else None


def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Authentication required.")
    token = authorization.split(" ", 1)[1]
    if SUPABASE_AUTH_ENABLED:
        response = httpx.get(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"}, timeout=10)
        if response.status_code != 200:
            raise HTTPException(401, "Invalid authentication token.")
        user = response.json()
        return {"id": user["id"], "username": user.get("user_metadata", {}).get("username") or user.get("email", "").split("@")[0], "email": user.get("email")}
    try:
        encoded, signature = token.split(".", 1)
        expected = hmac.new(SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if payload["exp"] < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(401, "Invalid or expired authentication token.")
    user = local_user(payload["sub"])
    if not user:
        raise HTTPException(401, "User no longer exists.")
    return user


initialize_users()
