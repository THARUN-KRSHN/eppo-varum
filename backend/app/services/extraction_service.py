import re
from typing import Any

from .validation import confidence_level, normalize_time

TIME_TOKEN = re.compile(r"(?<!\d)(\d{1,2}\s*[:.]\s*\d{2}(?:\s*[AP]M)?)(?!\d)", re.IGNORECASE)


def extract_timetable(raw_text: str, blocks: list[dict[str, Any]], document_id: str, source_type: str) -> dict[str, Any]:
    lines = [" ".join(line.split()) for line in raw_text.splitlines() if line.strip()]
    if not lines:
        lines = [block["text"] for block in blocks if block.get("text")]
    rows = []
    for sequence, line in enumerate(lines, 1):
        matches = list(TIME_TOKEN.finditer(line))
        if not matches:
            continue
        time_value = normalize_time(matches[0].group(1))
        before_time = line[:matches[0].start()].strip(" -|,;:")
        name = re.sub(r"^\d+[.)]?\s*", "", before_time).strip()
        if not name or len(name) < 2:
            continue
        departure = normalize_time(matches[1].group(1)) if len(matches) > 1 else None
        after_time = line[matches[-1].end():].strip(" -|,;:") if len(matches) > 1 else ""
        confidence = 0.9 if departure else 0.82
        rows.append({"sequence": len(rows) + 1, "name_en": name, "name_ml": None, "arrival_time": time_value, "departure_time": departure, "confidence": confidence, "evidence": {"source_text": line, "page": 1, "destination_text": after_time or None}})
    if not rows:
        raise ValueError("No stop/time rows were detected in the uploaded document.")
    origin = rows[0]["name_en"]
    destination = rows[-1]["name_en"]
    overall = round(sum(row["confidence"] for row in rows) / len(rows), 2)
    warnings = []
    if len(rows) < 2:
        warnings.append({"code": "INCOMPLETE_TIMETABLE", "message": "Only one timetable row was detected."})
    return {
        "document_id": document_id,
        "source_type": source_type,
        "route": {"origin": origin, "destination": destination},
        "stop_location": {"name": origin} if origin else None,
        "stops": rows,
        "overall_confidence": overall,
        "confidence_level": confidence_level(overall),
        "warnings": warnings,
        "verification_status": "REQUIRES_REVIEW",
    }
