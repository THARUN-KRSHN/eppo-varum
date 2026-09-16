import base64
import json
import re
from pathlib import Path
from typing import Any

import httpx

from ..core.config import GEMINI_API_KEY, GEMINI_MODEL


class GeminiExtractionError(RuntimeError):
    pass


PROMPT = """
You are extracting a public transport timetable from the attached image or PDF.
Use only text and table structure visible in the source. Do not guess, translate,
or invent missing values. Preserve the source row order.

Return JSON only with this exact shape:
{
  "route": {"origin": string|null, "destination": string|null},
  "stops": [
    {
      "sequence": integer,
      "name_en": string|null,
      "name_ml": string|null,
      "arrival_time": string|null,
      "departure_time": string|null,
      "confidence": number,
      "evidence": {"source_text": string, "page": integer|null}
    }
  ]
}

For a table with FROM, ARRIVAL, DEPARTURE, and TO columns, create one row
for each visible source row. Use the FROM stop as name_en/name_ml when present;
use the TO stop only for the route destination unless the table is clearly a
stop sequence. Keep both arrival and departure values. Time values may be
written as 06.10, 6:10 AM, or 06:10. Use null when a value is not visible.
Confidence must reflect visual certainty from 0 to 1. Do not use 0.99 for
unclear text. Do not include markdown fences or commentary.
""".strip()


def _json_from_response(value: str) -> dict[str, Any]:
    cleaned = value.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise GeminiExtractionError("Gemini returned invalid structured JSON.") from exc
    if not isinstance(parsed, dict) or not isinstance(parsed.get("stops"), list):
        raise GeminiExtractionError("Gemini returned an incomplete timetable structure.")
    return parsed


def extract_with_gemini(path: Path, file_type: str, document_id: str) -> dict[str, Any]:
    if not GEMINI_API_KEY:
        raise GeminiExtractionError("GEMINI_API_KEY is not configured.")
    mime_type = "application/pdf" if file_type == "PDF" else {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(path.suffix.lower())
    if not mime_type:
        raise GeminiExtractionError("Unsupported Gemini document type.")
    payload = {
        "contents": [{"parts": [
            {"text": PROMPT},
            {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(path.read_bytes()).decode("ascii")}},
        ]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    try:
        response = httpx.post(url, params={"key": GEMINI_API_KEY}, json=payload, timeout=90)
        response.raise_for_status()
        body = response.json()
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        extraction = _json_from_response(text)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise GeminiExtractionError("Gemini could not extract this timetable.") from exc
    extraction["document_id"] = document_id
    extraction["source_type"] = file_type
    extraction["extraction_engine"] = f"gemini:{GEMINI_MODEL}"
    return extraction