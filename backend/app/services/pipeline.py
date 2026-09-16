from pathlib import Path

from .extraction_service import extract_timetable
from .gemini_service import GeminiExtractionError, extract_with_gemini
from .ocr_service import extract_text
from .validation import validate_extraction


def process_document(path: Path, doc_id: str, file_type: str | None = None):
    detected_type = file_type or ("PDF" if path.suffix.lower() == ".pdf" else "IMAGE")
    try:
        extraction = extract_with_gemini(path, detected_type, doc_id)
        extraction["warnings"] = extraction.get("warnings", [])
    except GeminiExtractionError as gemini_error:
        ocr = extract_text(path, detected_type)
        extraction = extract_timetable(ocr["raw_text"], ocr["blocks"], doc_id, detected_type)
        extraction["ocr"] = {"raw_text": ocr["raw_text"], "blocks": ocr["blocks"], "engine": ocr["engine"]}
        extraction["extraction_engine"] = f"fallback:{ocr['engine']}"
        extraction["warnings"].append({"code": "GEMINI_FALLBACK", "message": str(gemini_error)})
    return validate_extraction(extraction)
