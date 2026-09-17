from fastapi import APIRouter, Query, HTTPException
from math import asin, cos, radians, sin, sqrt
import sqlite3
import json
from pathlib import Path
import httpx
from datetime import datetime, timedelta
from ..core.config import DATABASE_PATH
router=APIRouter(prefix="/stops",tags=["stops"])
DATA_PATH = Path(__file__).resolve().parents[2] / "data"

def load_dataset(filename: str):
    with (DATA_PATH / filename).open(encoding="utf-8") as source:
        return json.load(source)

DISTRICTS = load_dataset("districts.json")
MAJOR_STOPS = load_dataset("major_stops.json")
KSRTC_DEPOTS = load_dataset("ksrtc_depots.json")
SAMPLE_ROUTES = load_dataset("sample_routes.json")
STOPS=[
 {"id":"1","name_en":"Thrissur","name_ml":"തൃശ്ശൂർ","lat":10.5276,"lng":76.2144},
 {"id":"2","name_en":"Mannuthy","name_ml":"മണ്ണുത്തി","lat":10.545,"lng":76.247},
 {"id":"3","name_en":"Angamaly","name_ml":"അങ്കമാലി","lat":10.196,"lng":76.386},
 {"id":"4","name_en":"Aluva","name_ml":"ആലുവ","lat":10.1076,"lng":76.3516},
 {"id":"5","name_en":"Ernakulam","name_ml":"എറണാകുളം","lat":9.9816,"lng":76.2999}]
ALIASES={"angamali":"3","angamaly bus stand":"3","thrissur bus stand":"1"}

def normalize(value:str)->str:
    return " ".join(value.casefold().strip().split())

def network_data() -> dict:
    locations = {normalize(stop["name"]): stop for stop in MAJOR_STOPS}
    routes = []
    for route in SAMPLE_ROUTES:
        names = [route["origin"], *route.get("via", []), route["destination"]]
        coordinates = [
            {"name": name, "lat": locations[normalize(name)]["lat"], "lng": locations[normalize(name)]["lng"]}
            for name in names if normalize(name) in locations
        ]
        routes.append({**route, "coordinates": coordinates})
    return {"districts": DISTRICTS, "stops": MAJOR_STOPS, "depots": KSRTC_DEPOTS, "routes": routes}

def route_schedules_for_stop(stop_name: str) -> list[dict]:
    target = normalize(stop_name)
    schedules = []
    for route in network_data()["routes"]:
        coordinates = route["coordinates"]
        target_index = next((index for index, point in enumerate(coordinates) if normalize(point["name"]) == target), None)
        if target_index is None or not route.get("departure_times"):
            continue
        distances = [0.0]
        for previous, current in zip(coordinates, coordinates[1:]):
            distances.append(distances[-1] + haversine_km(previous["lat"], previous["lng"], current["lat"], current["lng"]))
        total_distance = distances[-1] or 1.0
        offset_minutes = round(route["duration_minutes"] * distances[target_index] / total_distance)
        for departure in route["departure_times"]:
            try:
                origin_time = datetime.strptime(departure, "%H:%M")
            except ValueError:
                continue
            arrival_datetime = origin_time + timedelta(minutes=offset_minutes)
            arrival = arrival_datetime.strftime("%H:%M")
            schedules.append({
                "route": f"{route['origin']} → {route['destination']}",
                "route_id": route["route_id"],
                "route_name": route["name"],
                "arrival_time": arrival if target_index else None,
                "departure_time": departure if target_index == 0 else arrival,
                "time": departure if target_index == 0 else arrival,
                "sort_time": arrival_datetime if target_index else origin_time,
                "type": "DATASET_DERIVED",
                "source": "sample_routes.json",
                "note": "Arrival and departure derived from route duration and stop distance; verify locally.",
            })
    return [{key: value for key, value in item.items() if key != "sort_time"} for item in sorted(schedules, key=lambda item: item["sort_time"])]

def haversine_km(first_lat: float, first_lng: float, second_lat: float, second_lng: float) -> float:
    earth_radius_km = 6371
    lat_delta = radians(second_lat - first_lat)
    lng_delta = radians(second_lng - first_lng)
    value = sin(lat_delta / 2) ** 2 + cos(radians(first_lat)) * cos(radians(second_lat)) * sin(lng_delta / 2) ** 2
    return earth_radius_km * 2 * asin(sqrt(value))

def published_departures(stop: dict) -> list[dict]:
    path = Path(DATABASE_PATH)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    if not path.exists():
        return []
    departures = []
    with sqlite3.connect(path) as connection:
        rows = connection.execute("SELECT extraction FROM documents WHERE status = 'PUBLISHED' AND extraction IS NOT NULL").fetchall()
    import json
    for (raw,) in rows:
        extraction = json.loads(raw)
        for row in extraction.get("stops", []):
            if normalize(row.get("name_en") or "") == normalize(stop["name_en"]) or normalize(row.get("name_ml") or "") == normalize(stop["name_ml"]):
                if row.get("arrival_time"):
                    departures.append({"route": f"{extraction.get('route', {}).get('origin', 'Unknown')} → {extraction.get('route', {}).get('destination', 'Unknown')}", "time": row["arrival_time"][:5], "type": "SCHEDULED", "source_document": extraction.get("document_id")})
    return departures

@router.get("/search")
def search(q:str=Query("")):
    query=normalize(q)
    return [s for s in STOPS if query in normalize(s["name_en"]) or query in normalize(s["name_ml"]) or any(query in alias for alias, stop_id in ALIASES.items() if stop_id == s["id"])]

@router.get("/network")
def network():
    return network_data()

@router.get("/geocode")
def geocode(q: str = Query(..., min_length=3, max_length=120)):
    query = normalize(q)
    local_matches = [
        {"place_id": f"local-{stop['id']}", "display_name": stop["name_en"], "lat": str(stop["lat"]), "lon": str(stop["lng"])}
        for stop in STOPS
        if query in normalize(stop["name_en"]) or query in normalize(stop["name_ml"])
    ]
    try:
        response = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"format": "jsonv2", "limit": 5, "countrycodes": "in", "q": q.strip()},
            headers={"Accept": "application/json", "User-Agent": "eppo-varum/1.0 (local transit contribution app)"},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        return local_matches

@router.get("/nearby")
def nearby(lat:float,lng:float,radius:int=Query(500, ge=1, le=50000)):
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        raise HTTPException(400, "Invalid coordinates.")
    earth_radius_m=6371000
    def distance(stop):
        lat_delta=radians(stop["lat"]-lat); lng_delta=radians(stop["lng"]-lng)
        value=sin(lat_delta/2)**2+cos(radians(lat))*cos(radians(stop["lat"]))*sin(lng_delta/2)**2
        return 2*earth_radius_m*asin(sqrt(value))
    return [{**stop,"distance_m":round(distance(stop),1)} for stop in STOPS if distance(stop)<=radius]

@router.get("/manual-routes")
def manual_routes():
    path = Path(DATABASE_PATH)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    if not path.exists():
        return []
    with sqlite3.connect(path) as connection:
        try:
            rows = connection.execute("SELECT id, location_name, lat, lng, origin, destination, departure_time FROM manual_routes WHERE status = 'PUBLISHED'").fetchall()
        except sqlite3.OperationalError:
            return []
    return [{"id": row[0], "name_en": row[1], "name_ml": "", "lat": row[2], "lng": row[3], "origin": row[4], "destination": row[5], "departure_time": row[6], "manual": True} for row in rows]

@router.get("/published-timetable")
def published_timetable_stops():
    path = Path(DATABASE_PATH)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    if not path.exists():
        return []
    with sqlite3.connect(path) as connection:
        rows = connection.execute("SELECT extraction FROM documents WHERE status = 'PUBLISHED' AND extraction IS NOT NULL").fetchall()
    published = []
    for (raw,) in rows:
        extraction = json.loads(raw)
        location = extraction.get("stop_location") or {}
        if not location.get("lat") or not location.get("lng"):
            continue
        published.append({
            "id": f"document-{extraction.get('document_id')}",
            "name_en": location.get("name") or extraction.get("route", {}).get("origin") or "Verified stop",
            "name_ml": location.get("name_ml") or "",
            "lat": float(location["lat"]),
            "lng": float(location["lng"]),
            "origin": extraction.get("route", {}).get("origin"),
            "destination": extraction.get("route", {}).get("destination"),
            "timetable": extraction.get("stops", []),
            "manual": False,
        })
    return published
@router.get("/{stop_id}/timetable")
def timetable(stop_id:str):
    s=next((x for x in STOPS if x["id"]==stop_id),None)
    dataset_stop = next((x for x in MAJOR_STOPS if x["code"] == stop_id), None)
    if dataset_stop:
        departures = route_schedules_for_stop(dataset_stop["name"])
        return {"stop": {"id": dataset_stop["code"], "name_en": dataset_stop["name"], "name_ml": "", "lat": dataset_stop["lat"], "lng": dataset_stop["lng"]}, "departures": departures, "data_status": "AVAILABLE" if departures else "NO_DATA_FOR_STOP", "schedule_source": "backend/data/sample_routes.json"}
    if not s:
        path = Path(DATABASE_PATH)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[3] / path
        try:
            with sqlite3.connect(path) as connection:
                row = connection.execute("SELECT id, location_name, lat, lng, origin, destination, departure_time FROM manual_routes WHERE id = ? AND status = 'PUBLISHED'", (stop_id,)).fetchone()
        except sqlite3.OperationalError:
            row = None
        if not row:
            return {"stop":None,"departures":[]}
        stop = {"id": row[0], "name_en": row[1], "name_ml": "", "lat": row[2], "lng": row[3]}
        return {"stop": stop, "departures": [{"route": f"{row[4]} → {row[5]}", "time": row[6], "type": "COMMUNITY", "source_document": row[0]}], "data_status": "AVAILABLE"}
    return {"stop":s,"departures":published_departures(s), "data_status": "AVAILABLE" if published_departures(s) else "NO_PUBLISHED_DATA"}
