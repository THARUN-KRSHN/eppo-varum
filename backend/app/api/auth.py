import sqlite3
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..core.config import SUPABASE_ANON_KEY, SUPABASE_AUTH_ENABLED, SUPABASE_URL
from ..services.auth_service import hash_password, issue_token, verify_password, _db_path

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    username: str = Field(min_length=2, max_length=40, pattern=r"^[A-Za-z0-9_.-]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


def response(user: dict, token: str):
    return {"success": True, "data": {"token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}}


@router.post("/signup")
def signup(credentials: Credentials):
    if SUPABASE_AUTH_ENABLED:
        result = httpx.post(f"{SUPABASE_URL}/auth/v1/signup", headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}, json={"email": str(credentials.email), "password": credentials.password, "data": {"username": credentials.username}}, timeout=15)
        if result.status_code >= 400:
            raise HTTPException(result.status_code, result.json().get("msg", "Could not create account."))
        data = result.json()
        if not data.get("access_token"):
            return {"success": True, "data": {"confirmation_required": True, "message": "Check your email to confirm your account."}}
        return response({"id": data["user"]["id"], "username": credentials.username, "email": str(credentials.email)}, data["access_token"])
    user = {"id": str(uuid.uuid4()), "username": credentials.username, "email": str(credentials.email), "password_hash": hash_password(credentials.password), "created_at": datetime.now(timezone.utc).isoformat()}
    try:
        with sqlite3.connect(_db_path()) as connection:
            connection.execute("INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)", tuple(user.values()))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Username or email is already registered.")
    return response(user, issue_token(user))


@router.post("/login")
def login(credentials: Login):
    if SUPABASE_AUTH_ENABLED:
        result = httpx.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}, json={"email": str(credentials.email), "password": credentials.password}, timeout=15)
        if result.status_code >= 400:
            raise HTTPException(401, "Email or password is incorrect.")
        data = result.json(); user = data["user"]
        return response({"id": user["id"], "username": user.get("user_metadata", {}).get("username", str(credentials.email).split("@")[0]), "email": user.get("email")}, data["access_token"])
    with sqlite3.connect(_db_path()) as connection:
        row = connection.execute("SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?", (str(credentials.email),)).fetchone()
    if not row or not verify_password(credentials.password, row[3]):
        raise HTTPException(401, "Email or password is incorrect.")
    user = {"id": row[0], "username": row[1], "email": row[2], "created_at": row[4]}
    return response(user, issue_token(user))
