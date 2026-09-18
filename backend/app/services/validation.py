from datetime import datetime, timedelta
import re
from typing import Any


TIME_RE = re.compile(r"^(?P<hour>\d{1,2})[:.]?(?P<minute>\d{2})(?::\d{2})?(?:\s*(?P<period>AM|PM))?$", re.IGNORECASE)


def normalize_time(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    match = TIME_RE.fullmatch(value.strip())
    if not match:
        return None
    hour = int(match.group("hour"))
    minute = int(match.group("minute"))
    period = match.group("period")
    if period:
        if not 1 <= hour <= 12 or minute > 59:
            return None
        if period.upper() == "AM":
            hour = 0 if hour == 12 else hour
        else:
            hour = 12 if hour == 12 else hour + 12
    elif hour > 23 or minute > 59:
        return None
    return f"{hour:02d}:{minute:02d}:00"


def confidence_level(confidence: float) -> str:
    if confidence >= 0.90:
        return "HIGH"
    if confidence >= 0.75:
        return "MEDIUM"
    return "LOW"


def fill_missing_times(extraction: dict[str, Any]) -> list[dict[str, Any]]:
    """Fill blank cells with clearly marked estimates so review can be completed."""
    stops = extraction.get("stops", [])
    known = []
    for stop in stops:
        value = normalize_time(stop.get("arrival_time") or stop.get("departure_time"))
        if value:
            known.append(datetime.strptime(value, "%H:%M:%S"))
    intervals = [(later - earlier).seconds for earlier, later in zip(known, known[1:]) if later > earlier]
    interval = timedelta(seconds=round(sorted(intervals)[len(intervals) // 2])) if intervals else timedelta(minutes=10)
    warnings = []
    first_known = bool(known)
    current = known[0] if first_known else datetime.strptime("06:00:00", "%H:%M:%S")
    for stop in stops:
        arrival = normalize_time(stop.get("arrival_time"))
        departure = normalize_time(stop.get("departure_time"))
        if not arrival:
            current = current - interval if first_known and not warnings else current + interval
            arrival = current.strftime("%H:%M:%S")
            stop["arrival_time"] = arrival
            warnings.append({"code": "PREDICTED_TIME", "sequence": stop.get("sequence"), "field": "arrival_time", "message": f"Arrival time was estimated as {arrival[:5]} because the source cell was empty."})
        else:
            current = datetime.strptime(arrival, "%H:%M:%S")
        if not departure:
            departure = (current + timedelta(minutes=2)).strftime("%H:%M:%S")
            stop["departure_time"] = departure
            warnings.append({"code": "PREDICTED_TIME", "sequence": stop.get("sequence"), "field": "departure_time", "message": f"Departure time was estimated as {departure[:5]} because the source cell was empty."})
        current = datetime.strptime(departure, "%H:%M:%S")
    return warnings


def validate_extraction(extraction: dict[str, Any]) -> dict[str, Any]:
    warnings: list[dict[str, Any]] = []
    route = extraction.get("route", {})
    if not route.get("origin"):
        warnings.append({"code": "MISSING_ORIGIN", "message": "Route origin is missing."})
    if not route.get("destination"):
        warnings.append({"code": "MISSING_DESTINATION", "message": "Route destination is missing."})

    stops = extraction.get("stops", [])
    if not stops:
        warnings.append({"code": "EMPTY_TIMETABLE", "message": "No timetable rows were extracted."})

    previous_seconds: int | None = None
    seen_sequences: set[int] = set()
    previous_name = None
    for stop in stops:
        sequence = stop.get("sequence")
        if float(stop.get("confidence", 0)) < 0.90:
            warnings.append({"code": "LOW_CONFIDENCE", "sequence": sequence, "message": "This timetable row requires human verification."})
        if sequence in seen_sequences:
            warnings.append({"code": "DUPLICATE_SEQUENCE", "sequence": sequence})
        seen_sequences.add(sequence)
        normalized = normalize_time(stop.get("arrival_time"))
        departure = normalize_time(stop.get("departure_time"))
        if stop.get("arrival_time") and normalized is None:
            warnings.append({"code": "INVALID_TIME", "sequence": sequence, "field": "arrival_time", "value": stop.get("arrival_time")})
        if stop.get("departure_time") and departure is None:
            warnings.append({"code": "INVALID_TIME", "sequence": sequence, "field": "departure_time", "value": stop.get("departure_time")})
        stop["arrival_time"] = normalized
        stop["departure_time"] = departure
        if normalized:
            parsed = datetime.strptime(normalized, "%H:%M:%S")
            seconds = parsed.hour * 3600 + parsed.minute * 60 + parsed.second
            if previous_seconds is not None and seconds < previous_seconds:
                warnings.append({"code": "NON_MONOTONIC_TIME", "sequence": sequence, "message": "Schedule time is earlier than the preceding stop."})
            previous_seconds = seconds
        name = stop.get("name_en") or stop.get("name_ml")
        if name and name == previous_name:
            warnings.append({"code": "DUPLICATE_CONSECUTIVE_STOP", "sequence": sequence, "name": name})
        previous_name = name

    signals = [float(stop.get("confidence", 0)) for stop in stops]
    overall = round(sum(signals) / len(signals), 2) if signals else 0.0
    extraction["overall_confidence"] = overall
    extraction["confidence_level"] = confidence_level(overall)
    extraction["warnings"] = warnings
    extraction["verification_status"] = "REQUIRES_REVIEW" if warnings or overall < 0.90 else "AUTO_ACCEPTED"
    return extraction