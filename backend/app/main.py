from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, documents, stops, timetables, notifications, contributions, gtfs

app = FastAPI(title="TransitLens API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for router in [auth.router, documents.router, stops.router, timetables.router, notifications.router, contributions.router, gtfs.router]:
    app.include_router(router, prefix="/api")

@app.get("/health")
def health(): return {"status":"ok","service":"transitlens-api"}

@app.get("/api/config")
def config():
    from .core.config import GEMINI_API_KEY, GEMINI_MODEL, SUPABASE_AUTH_ENABLED, SUPABASE_URL, SUPABASE_STORAGE_BUCKET
    return {"supabase_auth": SUPABASE_AUTH_ENABLED, "supabase_storage": bool(SUPABASE_URL), "storage_bucket": SUPABASE_STORAGE_BUCKET, "ocr": "tesseract", "gemini": bool(GEMINI_API_KEY), "gemini_model": GEMINI_MODEL}
