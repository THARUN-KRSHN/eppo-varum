from fastapi import APIRouter, BackgroundTasks, UploadFile, File, HTTPException, Depends
from datetime import datetime, timezone
from pathlib import Path
import uuid
from PIL import Image
from io import BytesIO
from pydantic import BaseModel, Field
from ..services.pipeline import process_document
from ..services.validation import validate_extraction
from ..services.document_store import documents
from ..services.auth_service import current_user
from ..services.storage_service import upload_to_supabase
router=APIRouter(prefix="/documents", tags=["documents"])
UPLOAD=Path(__file__).resolve().parents[2] / "data" / "uploads"; UPLOAD.mkdir(parents=True,exist_ok=True)

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_PDF_SIZE = 25 * 1024 * 1024


def validate_file(data: bytes, filename: str, content_type: str | None) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        if len(data) > MAX_IMAGE_SIZE:
            raise HTTPException(413, "Image exceeds the 10 MB limit.")
        try:
            image = Image.open(BytesIO(data))
            image.verify()
        except Exception as exc:
            raise HTTPException(400, "Invalid image file.") from exc
        detected = Image.open(BytesIO(data)).format
        valid_extension = (detected == "JPEG" and suffix in {".jpg", ".jpeg"}) or detected == suffix.removeprefix(".").upper()
        if not valid_extension:
            raise HTTPException(400, "File extension does not match its contents.")
        return "IMAGE"
    if suffix == ".pdf":
        if len(data) > MAX_PDF_SIZE:
            raise HTTPException(413, "PDF exceeds the 25 MB limit.")
        if not data.startswith(b"%PDF-"):
            raise HTTPException(400, "Invalid PDF file.")
        return "PDF"
    raise HTTPException(400, "Unsupported file format.")


def run_processing(document_id: str, path: Path, file_type: str) -> None:
    documents.update(document_id, status="PREPROCESSING")
    try:
        documents.update(document_id, status="OCR_PROCESSING")
        documents.update(document_id, status="STRUCTURING")
        result = process_document(path, document_id, file_type)
        documents.update(document_id, status="VALIDATING")
        documents.update(document_id, status="REVIEW_REQUIRED", extraction=result)
    except Exception as exc:
        documents.update(document_id, status="PROCESSING_FAILED", failure_reason=str(exc), failure_stage="PROCESSING")

@router.post("")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile=File(...), user: dict = Depends(current_user)):
    data=await file.read()
    file_type = validate_file(data, file.filename or "upload", file.content_type)
    doc_id=str(uuid.uuid4()); path=UPLOAD/(doc_id+Path(file.filename or "upload").suffix.lower())
    path.write_bytes(data)
    storage_path = upload_to_supabase(path, doc_id, file.content_type or "application/octet-stream")
    documents.create({"id": doc_id, "uploaded_by": user["id"], "status": "QUEUED", "file_type": file_type, "original_filename": file.filename, "file_size": len(data), "path": str(path), "storage_path": storage_path, "created_at": datetime.now(timezone.utc).isoformat()})
    background_tasks.add_task(run_processing, doc_id, path, file_type)
    return {"success":True,"document_id":doc_id,"status":"QUEUED"}

@router.get("/{document_id}/status")
def status(document_id:str, user: dict = Depends(current_user)):
    document = documents.get(document_id)
    if document is None:
        raise HTTPException(404, "Document not found.")
    if document.get("uploaded_by") != user["id"]:
        raise HTTPException(403, "You do not own this document.")
    return {"document_id": document_id, "status": document["status"], "failure_reason": document.get("failure_reason"), "updated_at": document.get("updated_at")}


@router.get("/{document_id}/extraction")
def extraction(document_id: str, user: dict = Depends(current_user)):
    document = documents.get(document_id)
    if document is None:
        raise HTTPException(404, "Document not found.")
    if document.get("uploaded_by") != user["id"]:
        raise HTTPException(403, "You do not own this document.")
    if "extraction" not in document or not document["extraction"]:
        raise HTTPException(409, "Document extraction is not ready.")
    return {"document_id": document_id, **document["extraction"]}


class Correction(BaseModel):
    sequence: int = Field(ge=1)
    field: str = Field(pattern=r"^(name_en|name_ml|arrival_time|departure_time)$")
    value: str | None = None


@router.patch("/{document_id}/extraction")
def correct(document_id: str, correction: Correction, user: dict = Depends(current_user)):
    document = documents.get(document_id)
    if not document or document.get("uploaded_by") != user["id"]:
        raise HTTPException(404, "Document not found.")
    extraction = document.get("extraction")
    if not extraction:
        raise HTTPException(409, "Document extraction is not ready.")
    stop = next((row for row in extraction["stops"] if row.get("sequence") == correction.sequence), None)
    if not stop:
        raise HTTPException(404, "Timetable row not found.")
    original = stop.get(correction.field)
    stop[correction.field] = correction.value
    stop.setdefault("corrections", []).append({"field": correction.field, "original_value": original, "corrected_value": correction.value, "corrected_by": user["id"], "corrected_at": datetime.now(timezone.utc).isoformat()})
    extraction["verification_status"] = "USER_CORRECTED"
    documents.update(document_id, extraction=extraction, status="REVIEW_REQUIRED")
    return {"success": True, "data": extraction}


@router.post("/{document_id}/verify")
def verify(document_id: str, user: dict = Depends(current_user)):
    document = documents.get(document_id)
    if not document or document.get("uploaded_by") != user["id"]:
        raise HTTPException(404, "Document not found.")
    extraction = document.get("extraction")
    if not extraction:
        raise HTTPException(409, "Document extraction is not ready.")
    checked = validate_extraction(extraction)
    blocking_codes = {"MISSING_ORIGIN", "MISSING_DESTINATION", "EMPTY_TIMETABLE", "INVALID_TIME", "NON_MONOTONIC_TIME"}
    if any(warning.get("code") in blocking_codes for warning in checked.get("warnings", [])):
        raise HTTPException(422, {"code": "VALIDATION_FAILED", "message": "Resolve invalid or inconsistent timetable values before publishing.", "warnings": checked["warnings"]})
    extraction["verification_status"] = "HUMAN_VERIFIED"
    documents.update(document_id, extraction=extraction, status="PUBLISHED")
    return {"success": True, "document_id": document_id, "status": "PUBLISHED", "message": "Timetable published successfully."}


@router.get("")
def list_documents(user: dict = Depends(current_user)):
    return {"success": True, "data": documents.list_by_user(user["id"])}


@router.post("/{document_id}/retry")
def retry(document_id: str, background_tasks: BackgroundTasks, user: dict = Depends(current_user)):
    document = documents.get(document_id)
    if document is None:
        raise HTTPException(404, "Document not found.")
    if document.get("uploaded_by") != user["id"]:
        raise HTTPException(403, "You do not own this document.")
    if document.get("status") != "PROCESSING_FAILED":
        raise HTTPException(409, "Only failed documents can be retried.")
    documents.update(document_id, status="QUEUED", failure_reason=None, failure_stage=None)
    background_tasks.add_task(run_processing, document_id, Path(document["path"]), document["file_type"])
    return {"document_id": document_id, "status": "QUEUED"}
