from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from ..core.config import GEMINI_API_KEY, GEMINI_MODEL
from .validation import normalize_time


class GeminiExtractionError(RuntimeError):
    pass


class BusTrip(BaseModel):
    from_location: str = Field(description="The visible FROM location for this row")
    arrival_time: str = Field(description="The visible arrival time, normalized to HH:MM when possible")
    departure_time: str = Field(description="The visible departure time, normalized to HH:MM when possible")
    to_location: str = Field(description="The visible TO location for this row")


class BusScheduleTable(BaseModel):
    trips: list[BusTrip] = Field(description="Every visible timetable row, in source order")


PROMPT = """
You are an expert at reading KSRTC bus timetable boards. Extract every visible
table row from the attached image or PDF, in exactly the source order.

The columns may be FROM, ARRIVAL, DEPARTURE, and TO. Read each row horizontally:
the FROM value belongs to that row, both time values belong to that row, and the
TO value belongs to that row. Do not shift values between rows or columns.
Correct obvious OCR-like spelling errors using the visible text and common
Kerala place names such as ANKAMALY, ALUVA, CHERTHALA, VAIKOM, THRISSUR,
ALAPPUZHA, and CHALAKKUDY. Do not invent a value that is not visible; use an
empty string when a cell cannot be read. Return times as HH:MM in 24-hour form
when the source provides enough information. Return only data matching the
provided response schema.
""".strip()


def _to_extraction(schedule: BusScheduleTable, document_id: str, source_type: str) -> dict[str, Any]:
    stops = []
    for sequence, trip in enumerate(schedule.trips, 1):
        arrival = normalize_time(trip.arrival_time) or trip.arrival_time or None
        departure = normalize_time(trip.departure_time) or trip.departure_time or None
        source_text = " | ".join(value for value in (trip.from_location, trip.arrival_time, trip.departure_time, trip.to_location) if value)
        stops.append({
            "sequence": sequence,
            "name_en": trip.from_location or None,
            "name_ml": None,
            "arrival_time": arrival,
            "departure_time": departure,
            "to_location": trip.to_location or None,
            "confidence": 0.9,
            "evidence": {"source_text": source_text, "page": 1},
        })
    origin = next((trip.from_location for trip in schedule.trips if trip.from_location), None)
    destination = next((trip.to_location for trip in reversed(schedule.trips) if trip.to_location), None)
    return {
        "document_id": document_id,
        "source_type": source_type,
        "route": {"origin": origin, "destination": destination},
        "stops": stops,
        "extraction_engine": f"gemini:{GEMINI_MODEL}:structured",
    }


def extract_with_gemini(path: Path, file_type: str, document_id: str, ocr_text: str = "") -> dict[str, Any]:
    if not GEMINI_API_KEY:
        raise GeminiExtractionError("GEMINI_API_KEY is not configured.")
    mime_type = "application/pdf" if file_type == "PDF" else {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(path.suffix.lower())
    if not mime_type:
        raise GeminiExtractionError("Unsupported Gemini document type.")
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)
        ocr_hint = f"\n\nOCR candidate text for cross-checking only:\n{ocr_text}" if ocr_text else ""
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=path.read_bytes(), mime_type=mime_type),
                PROMPT + ocr_hint,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BusScheduleTable,
                temperature=0.0,
            ),
        )
        if not response.text:
            raise GeminiExtractionError("Gemini returned an empty structured response.")
        schedule = BusScheduleTable.model_validate_json(response.text)
        return _to_extraction(schedule, document_id, file_type)
    except GeminiExtractionError:
        raise
    except Exception as exc:
        raise GeminiExtractionError("Gemini structured extraction failed.") from exc