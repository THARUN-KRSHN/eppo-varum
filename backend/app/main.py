from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, documents, stops, timetables, notifications, contributions, gtfs
from .core.config import CORS_ORIGIN_REGEX, CORS_ORIGINS

app = FastAPI(title="eppo varum API | എപ്പോ വരും", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_origin_regex=CORS_ORIGIN_REGEX, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for router in [auth.router, documents.router, stops.router, timetables.router, notifications.router, contributions.router, gtfs.router]:
    app.include_router(router, prefix="/api")

@app.get("/health")
def health(): return {"status":"ok","service":"eppo-varum-api","product":"eppo varum","product_ml":"എപ്പോ വരും"}

@app.get("/api/config")
def config():
    from .core.config import CORS_ORIGIN_REGEX, CORS_ORIGINS, OPENROUTER_API_KEY, OPENROUTER_MODEL, SUPABASE_AUTH_ENABLED, SUPABASE_URL, SUPABASE_STORAGE_BUCKET
    return {"supabase_auth": SUPABASE_AUTH_ENABLED, "supabase_storage": bool(SUPABASE_URL), "storage_bucket": SUPABASE_STORAGE_BUCKET, "ocr": "tesseract", "openrouter": bool(OPENROUTER_API_KEY), "openrouter_model": OPENROUTER_MODEL, "cors_origins": CORS_ORIGINS, "cors_origin_regex": CORS_ORIGIN_REGEX}
