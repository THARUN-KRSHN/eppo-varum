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
        matches = TIME_TOKEN.findall(line)
        if not matches:
            continue
        time_value = normalize_time(matches[0])
        before_time = line[:TIME_TOKEN.search(line).start()].strip(" -|,;:")
        name = re.sub(r"^\d+[.)]?\s*", "", before_time).strip()
        if not name or len(name) < 2:
            continue
        confidence = 0.82 if time_value else 0.0
        rows.append({"sequence": sequence, "name_en": name, "name_ml": None, "arrival_time": time_value, "departure_time": None, "confidence": confidence, "evidence": {"source_text": line, "page": 1}})
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
        "stops": rows,
        "overall_confidence": overall,
        "confidence_level": confidence_level(overall),
        "warnings": warnings,
        "verification_status": "REQUIRES_REVIEW",
    }
