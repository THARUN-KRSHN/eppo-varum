from pathlib import Path

import httpx

from ..core.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, SUPABASE_URL


def upload_to_supabase(path: Path, document_id: str, content_type: str) -> str | None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    storage_path = f"documents/{document_id}/{path.name}"
    response = httpx.post(
        f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{storage_path}",
        headers={"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "apikey": SUPABASE_SERVICE_ROLE_KEY, "Content-Type": content_type, "x-upsert": "false"},
        content=path.read_bytes(), timeout=30,
    )
    response.raise_for_status()
    return storage_path
