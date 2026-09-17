from pathlib import Path

from .extraction_service import extract_timetable
from .gemini_service import GeminiExtractionError, extract_with_gemini
from .ocr_service import OCRUnavailable, extract_text
from .validation import validate_extraction


def process_document(path: Path, doc_id: str, file_type: str | None = None):
    detected_type = file_type or ("PDF" if path.suffix.lower() == ".pdf" else "IMAGE")
    ocr = None
    try:
        ocr = extract_text(path, detected_type)
    except OCRUnavailable:
        pass
    try:
        extraction = extract_with_gemini(path, detected_type, doc_id, ocr["raw_text"] if ocr else "")
        extraction["warnings"] = extraction.get("warnings", [])
        if ocr:
            extraction["ocr"] = {"raw_text": ocr["raw_text"], "blocks": ocr["blocks"], "engine": ocr["engine"]}
    except GeminiExtractionError as gemini_error:
        if ocr is None:
            ocr = extract_text(path, detected_type)
        extraction = extract_timetable(ocr["raw_text"], ocr["blocks"], doc_id, detected_type)
        extraction["ocr"] = {"raw_text": ocr["raw_text"], "blocks": ocr["blocks"], "engine": ocr["engine"]}
        extraction["extraction_engine"] = f"fallback:{ocr['engine']}"
        extraction["warnings"].append({"code": "GEMINI_FALLBACK", "message": str(gemini_error)})
    return validate_extraction(extraction)
