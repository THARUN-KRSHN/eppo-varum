import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


DATABASE_PATH = os.getenv("TRANSITLENS_DATABASE_PATH", "backend/data/transitlens.sqlite3")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "timetables")
SUPABASE_AUTH_ENABLED = bool(SUPABASE_URL and (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
AUTH_SECRET = os.getenv("TRANSITLENS_AUTH_SECRET", "transitlens-local-development-secret")
CORS_ORIGINS = [origin.strip().rstrip("/").strip('"\'') for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://([a-z0-9-]+\.)?vercel\.app$")
MAX_AUTH_BODY_LENGTH = 4096