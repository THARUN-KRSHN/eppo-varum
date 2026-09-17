import base64
import json
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel, Field

from ..core.config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from .validation import normalize_time


class OpenRouterExtractionError(RuntimeError):
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
when the source provides enough information. Return only valid JSON matching
this structure: {"trips":[{"from_location":"","arrival_time":"",
"departure_time":"","to_location":""}]}.
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
        "stop_location": None,
        "stops": stops,
        "extraction_engine": f"openrouter:{OPENROUTER_MODEL}:structured",
    }


def _content_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(part.get("text", "") for part in content if isinstance(part, dict))
    return ""


def extract_with_openrouter(path: Path, file_type: str, document_id: str, ocr_text: str = "") -> dict[str, Any]:
    if not OPENROUTER_API_KEY:
        raise OpenRouterExtractionError("OPENROUTER_API_KEY is not configured.")
    mime_type = "application/pdf" if file_type == "PDF" else {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(path.suffix.lower())
    if not mime_type:
        raise OpenRouterExtractionError("Unsupported OpenRouter document type.")

    encoded_document = base64.b64encode(path.read_bytes()).decode("ascii")
    document_url = f"data:{mime_type};base64,{encoded_document}"
    document_part = (
        {"type": "file", "file": {"filename": path.name, "file_data": document_url}}
        if mime_type == "application/pdf"
        else {"type": "image_url", "image_url": {"url": document_url}}
    )
    ocr_hint = f"\n\nOCR candidate text for cross-checking only:\n{ocr_text}" if ocr_text else ""
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": [{"type": "text", "text": PROMPT + ocr_hint}, document_part]}],
        "response_format": {"type": "json_object"},
        "temperature": 0,
        "max_tokens": 8192,
    }
    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=120.0,
        )
        response.raise_for_status()
        response_data = response.json()
        content = _content_text(response_data["choices"][0]["message"]["content"]).strip()
        if not content:
            raise OpenRouterExtractionError("OpenRouter returned an empty structured response.")
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        schedule = BusScheduleTable.model_validate(json.loads(content))
        return _to_extraction(schedule, document_id, file_type)
    except httpx.HTTPStatusError as exc:
        detail = ""
        try:
            detail = exc.response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        message = f"OpenRouter request failed ({exc.response.status_code})"
        if detail:
            message += f": {detail}"
        raise OpenRouterExtractionError(message) from exc
    except OpenRouterExtractionError:
        raise
    except Exception as exc:
        raise OpenRouterExtractionError("OpenRouter structured extraction failed.") from exc