# TransitLens

AI-powered multilingual bus timetable digitization platform.

## Stack
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL/PostGIS-ready schema
- Processing: OpenCV + PaddleOCR/LLM adapters (optional dependencies)
- Maps: MapLibre/OpenStreetMap-ready
- Notifications: scheduled timetable alert engine + demo trigger

## Quick start

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and API docs at http://localhost:8000/docs.

## Configuration
The upload flow is real: image files are preprocessed with OpenCV, text is extracted with Tesseract (English + Malayalam), normalized, persisted, edited, audited, and published only after verification. Local development stores metadata in SQLite. Configure Supabase Auth and private Storage by copying the environment templates and following [docs/SETUP.md](docs/SETUP.md).

OpenStreetMap tiles require no API key for development. The map keeps attribution visible and uses the real coordinates returned by the backend. It represents stops and scheduled timetable data, not live bus GPS.

The minimum external OCR setup on Windows is Tesseract with both `eng` and `mal` language data installed and `tesseract.exe` available on `PATH`.

## Scope
Core: image/PDF/camera input, OCR pipeline abstraction, structured route/stop/time extraction, confidence, manual correction, verification, storage model, GTFS-compatible export, OSM-ready map, stop search/timetable, crowdsourced contributions, scheduled notification demo.

Real-time GPS tracking and ticketing are intentionally out of scope.
