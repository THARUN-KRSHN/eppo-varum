from pathlib import Path
import re

from .extraction_service import extract_timetable
from .openrouter_service import OpenRouterExtractionError, extract_with_openrouter
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
        extraction = extract_with_openrouter(path, detected_type, doc_id, ocr["raw_text"] if ocr else "")
        extraction["warnings"] = extraction.get("warnings", [])
        if ocr:
            extraction["ocr"] = {"raw_text": ocr["raw_text"], "blocks": ocr["blocks"], "engine": ocr["engine"]}
            _merge_ocr_values(extraction, ocr, doc_id, detected_type)
    except OpenRouterExtractionError as openrouter_error:
        if ocr is None:
            ocr = extract_text(path, detected_type)
        extraction = extract_timetable(ocr["raw_text"], ocr["blocks"], doc_id, detected_type)
        extraction["ocr"] = {"raw_text": ocr["raw_text"], "blocks": ocr["blocks"], "engine": ocr["engine"]}
        extraction["extraction_engine"] = f"fallback:{ocr['engine']}"
        extraction["warnings"].append({"code": "OPENROUTER_FALLBACK", "message": str(openrouter_error)})
    return validate_extraction(extraction)


def _merge_ocr_values(extraction: dict, ocr: dict, document_id: str, source_type: str) -> None:
    """Recover visible times when the vision model leaves table cells blank."""
    structured_rows = extraction.get("stops", [])
    if structured_rows and all(row.get("arrival_time") or row.get("departure_time") for row in structured_rows):
        return
    try:
        ocr_extraction = extract_timetable(ocr["raw_text"], ocr["blocks"], document_id, source_type)
    except ValueError:
        ocr_extraction = {"stops": [], "stop_location": None}
    ocr_times = _time_values(ocr["raw_text"])
    for index, row in enumerate(structured_rows):
        ocr_row = ocr_extraction["stops"][index] if index < len(ocr_extraction["stops"]) else {}
        row["arrival_time"] = row.get("arrival_time") or ocr_row.get("arrival_time") or (ocr_times[index * 2] if index * 2 < len(ocr_times) else None)
        row["departure_time"] = row.get("departure_time") or ocr_row.get("departure_time") or (ocr_times[index * 2 + 1] if index * 2 + 1 < len(ocr_times) else None)
        if ocr_row.get("evidence") or ocr_times:
            row["evidence"] = {**row.get("evidence", {}), "ocr_source_text": ocr_row.get("evidence", {}).get("source_text") or "OCR time-column recovery"}
    if not extraction.get("stop_location"):
        extraction["stop_location"] = ocr_extraction.get("stop_location")


def _time_values(raw_text: str) -> list[str]:
    matches = re.findall(r"(?<!\d)(\d{1,2}\s*[:.]\s*\d{2}(?:\s*[AP]M)?)(?!\d)", raw_text, re.IGNORECASE)
    from .validation import normalize_time
    return [normalized for value in matches if (normalized := normalize_time(value))]
