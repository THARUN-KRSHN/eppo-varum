# eppo varum | എപ്പോ വരും

**eppo varum** is a bilingual Malayalam and English transit-data platform for turning photographed bus boards, timetable PDFs, and local rider knowledge into searchable, verifiable scheduled transit information.

The name means **"When will it come?"**. The application answers that question from published timetable data. It does not claim to provide live GPS locations, live traffic predictions, or guaranteed arrival times.

## What The Project Does

The project has two contribution paths:

1. **Document contribution:** A user uploads a timetable image or PDF. The backend extracts rows with an OpenRouter vision model, validates the result, and sends uncertain data to a human verification screen before publication.
2. **Manual route contribution:** A user searches for a place using OpenStreetMap suggestions, selects the exact suggested coordinate, enters the bus origin, destination, and departure time, and publishes the point directly to the public map.

Only published data is returned by public timetable and map APIs.

## Current Features

### Timetable extraction

- JPG, JPEG, PNG, WEBP, and PDF uploads
- OpenRouter multimodal API integration
- Pydantic-enforced response schema for every timetable row
- Multimodal extraction of `FROM`, `ARRIVAL`, `DEPARTURE`, and `TO` columns
- OCR transcript supplied to the vision model as supporting evidence
- Multi-pass OpenCV/Tesseract fallback using denoising, threshold variants, and multiple page segmentation modes
- English and Malayalam Tesseract language support
- Arrival and departure normalization to `HH:MM:SS`
- Per-row evidence text, confidence, source document, and page information
- Validation warnings for missing endpoints, invalid times, duplicate sequences, repeated stops, low confidence, and non-monotonic times

### Review and publication

- Authenticated upload ownership
- Extraction review page with editable fields
- Correction and verification workflow
- Human verification required when validation warnings remain or confidence is low
- Public APIs read only `PUBLISHED` documents

### Manual community routes

- Location search through the backend geocoding proxy at `/api/stops/geocode`
- OpenStreetMap Nominatim suggestions with a server-side User-Agent
- Local known-stop fallback when the external geocoder is unavailable
- Coordinate-backed manual route records
- Origin, destination, departure time, username, location, and publication timestamp
- Published manual route markers and timetable details on the map

### Map, search, and alerts

- OpenStreetMap tiles with visible attribution
- Curated stop coordinates and public manual route coordinates
- English, Malayalam, and alias-based stop search
- Stop timetable details and scheduled departures
- Scheduled alert demo workflow
- GTFS-compatible stop endpoint direction
- Responsive Next.js bilingual interface

## Data Flow

### Document contribution

```text
Upload image/PDF
      |
      v
OpenCV preprocessing + Tesseract evidence
      |
      v
OpenRouter vision + Pydantic BusScheduleTable schema
      |
      v
Existing route/stops extraction contract
      |
      v
Time, confidence, sequence, and evidence validation
      |
      v
Human correction and verification
      |
      v
Published timetable -> map/search/timetable/alerts
```

OCR is collected before OpenRouter so the model can use it as a cross-check while still reading the original image or PDF. If OpenRouter is unavailable, the validated OCR parser is used as a fallback.

### Manual route contribution

```text
Search location
      |
      v
Backend geocoding proxy -> Nominatim or local stop fallback
      |
      v
Select coordinate + enter route and departure time
      |
      v
Authenticated POST /api/contributions/manual-route
      |
      v
Published coordinate -> public map and timetable API
```

## Repository Structure

```text
backend/
  app/
    api/                 FastAPI route modules
    core/                Environment and application configuration
      services/            OCR, OpenRouter, extraction, validation, storage, auth
  data/                  Local SQLite database and development uploads
  requirements.txt       Python dependencies
frontend/
  app/                   Next.js pages and global styles
  components/            Auth, language, Leaflet map, navigation
  locales/               English and Malayalam copy
docs/
  BACKEND.md             Backend invariants and production notes
  SETUP.md               External service and local setup details
```

## Technology

### Frontend

- Next.js App Router 15
- React and TypeScript
- Tailwind CSS
- React Leaflet and OpenStreetMap
- Lucide icons
- English/Malayalam language provider
- Vercel deployment target

### Backend

- FastAPI and Uvicorn
- Pydantic models and validation
- OpenRouter multimodal API
- `google/gemini-2.5-flash` by default through OpenRouter
- OpenCV, Pillow, pytesseract, and pypdf
- SQLite for local development
- Optional Supabase Auth and private Storage
- Render deployment target

## Processing States

```text
QUEUED -> PREPROCESSING -> OCR_PROCESSING -> STRUCTURING
       -> VALIDATING -> REVIEW_REQUIRED -> PUBLISHED
                              \\-> PROCESSING_FAILED
```

OpenRouter extraction is performed during the structuring stage. OCR evidence is retained in the extraction response even when the vision model succeeds.

## API Reference

### System and authentication

```text
GET  /health
GET  /api/config
POST /api/auth/signup
POST /api/auth/login
```

### Documents and verification

```text
POST /api/documents
GET  /api/documents
GET  /api/documents/{document_id}/status
GET  /api/documents/{document_id}/extraction
PATCH /api/documents/{document_id}/extraction
POST /api/documents/{document_id}/verify
```

### Stops and public route data

```text
GET /api/stops/search?q=angamaly
GET /api/stops/geocode?q=Aluva
GET /api/stops/nearby?lat=10.1076&lng=76.3516
GET /api/stops/manual-routes
GET /api/stops/{stop_id}/timetable
```

`/api/stops/geocode` is intentionally server-side. The browser does not call Nominatim directly, avoiding browser CORS failures and allowing the backend to send the required identifying User-Agent.

### Contributions and alerts

```text
POST /api/contributions
GET  /api/contributions
GET  /api/contributions/public
POST /api/contributions/manual-route
GET  /api/contributions/manual-routes/public
POST /api/notifications/demo-trigger
GET  /api/gtfs/stops
```

Manual route publication requires a Bearer token. The request body is:

```json
{
  "location_name": "Aluva Bus Stand, Kerala, India",
  "lat": 10.1076,
  "lng": 76.3516,
  "origin": "Aluva",
  "destination": "Angamaly",
  "departure_time": "06:10"
}
```

## Local Development

### Prerequisites

- Python 3.11 or newer
- Node.js and npm
- Tesseract OCR on `PATH`
- Tesseract `eng` and `mal` language packs for the fallback path
- An OpenRouter API key for document extraction

### Backend setup

From the repository root:

```powershell
python -m venv .venv
.venv\\Scripts\\activate
python -m pip install -r backend\\requirements.txt
```

Create `backend/.env` from the project environment template and configure at least:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemini-2.5-flash
TRANSITLENS_AUTH_SECRET=replace_with_a_long_random_secret
CORS_ORIGINS=http://localhost:3000
```

Run the API:

```powershell
cd backend
..\\.venv\\Scripts\\activate
uvicorn app.main:app --reload --port 8000
```

The API and interactive docs are available at:

- `http://localhost:8000/health`
- `http://localhost:8000/docs`

### Frontend setup

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The application opens at `http://localhost:3000`. Set this value in `frontend/.env.local` when the backend is not running at the default address:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Tesseract verification on Windows

```powershell
tesseract --version
tesseract --list-langs
```

The language list should contain `eng` and `mal`. If Tesseract is installed outside `PATH`, configure `pytesseract.pytesseract.tesseract_cmd` in [ocr_service.py](backend/app/services/ocr_service.py).

PDFs with a text layer are read using `pypdf`. Image-based PDFs require a vision-capable OpenRouter model or a future PDF rasterization worker; the current fallback reports a clear OCR-unavailable error when no text layer exists.

## OpenRouter Configuration

Create a key in [OpenRouter](https://openrouter.ai/keys) and set `OPENROUTER_API_KEY` only in the backend environment.

The service in [openrouter_service.py](backend/app/services/openrouter_service.py) uses:

- OpenRouter's OpenAI-compatible `/api/v1/chat/completions` endpoint
- Base64 image/PDF data URLs for the uploaded document
- JSON response mode
- Pydantic validation through `BusScheduleTable.model_validate(...)`

The structured schema requires every row to contain `from_location`, `arrival_time`, `departure_time`, and `to_location`. The service then maps those fields into the existing application fields such as `name_en`, `arrival_time`, `departure_time`, route endpoints, and evidence.

The backend reports only whether OpenRouter is configured:

```text
GET http://localhost:8000/api/config
```

Never expose `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or other server secrets in frontend environment variables.

## Supabase Auth and Storage

Supabase is optional for local development. Without Supabase variables, the project uses its local SQLite/password fallback.

For the hosted flow:

1. Create a Supabase project.
2. Enable Email/Password authentication.
3. Create a private Storage bucket named `timetables`.
4. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` in the backend environment.
5. Keep the service-role key on the backend only.

## OpenStreetMap and Location Search

The map uses OpenStreetMap tiles with visible attribution. The contribution location search uses Nominatim through the backend proxy. No map API key is required for local development.

For production traffic, use a hosted OSM tile provider or self-host tiles according to the provider's usage policy. Nominatim also has usage limits; production deployments should use a suitable geocoding provider or a properly cached service rather than sending high-volume search traffic directly to the public endpoint.

## Deployment

### Render backend

The [render.yaml](render.yaml) Blueprint creates the API service:

1. Push the repository to GitHub.
2. Create a Render Blueprint from the repository.
3. Add `OPENROUTER_API_KEY`, Supabase variables, and `CORS_ORIGINS` in the Render dashboard.
4. Set the health check path to `/health`.
5. Use the generated Render URL as the frontend API base URL.

The free Render filesystem is ephemeral. Supabase Storage can preserve uploaded files, but local SQLite metadata can reset after restarts. A durable production deployment should move users, documents, routes, and contribution metadata to Supabase Postgres or another persistent database.

### Vercel frontend

1. Import the repository into Vercel.
2. Set the project root directory to `frontend`.
3. Add:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com/api
```

4. Add the exact Vercel origin to the backend `CORS_ORIGINS` value.

## Docker

The repository includes [docker-compose.yml](docker-compose.yml) and separate Dockerfiles for the backend and frontend. Review the database and environment configuration before using the Compose profile for deployment; the application's current local persistence path is SQLite, while the Compose file also defines a PostGIS service for future database integration.

## Verification Commands

From the repository root:

```powershell
.\\.venv\\Scripts\\python.exe -m compileall -q backend\\app
Push-Location frontend
npm run build
Pop-Location
git diff --check
```

Useful focused checks include:

```powershell
.\\.venv\\Scripts\\python.exe -c "from google import genai; from google.genai import types; print('google-genai available')"
Invoke-WebRequest http://localhost:8000/api/stops/geocode?q=Aluva

The backend also allows Vercel preview domains through `CORS_ORIGIN_REGEX` by default. For a custom frontend domain, set both values in Render, for example:

```env
CORS_ORIGINS=https://your-custom-domain.com
CORS_ORIGIN_REGEX=https://your-custom-domain\\.com$
```

After changing Render environment variables, redeploy the backend. A browser signup request should show `OPTIONS /api/auth/signup` with status `200`; a `400` means the frontend origin is not allowed yet.
```

## Scope Boundaries

This project does not provide:

- Live bus GPS tracking
- Guaranteed arrival predictions
- Live traffic prediction
- Ticketing or payments
- Driver tracking
- Fleet dispatch

Alerts and map departures are scheduled timetable information. Manual route records are community-published data and should be reviewed or moderated before being treated as authoritative.

## Documentation

- [Backend notes](docs/BACKEND.md)
- [Setup and external services](docs/SETUP.md)
- [Render configuration](render.yaml)
- [Vercel configuration](vercel.json)
