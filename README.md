# eppo varum | എപ്പോ വരും

**eppo varum** is a Malayalam + English transit-data platform that turns photographed bus timetables and PDFs into searchable, verifiable scheduled transit information.

The name means **"When will it come?"**. The product answers that question from published timetable data while clearly avoiding claims about live GPS or guaranteed arrival times.

## Product Overview

Printed bus schedules are often available only on boards, signs, images, and scanned documents. eppo varum makes that information reusable:

```text
Image / PDF -> Gemini Vision extraction -> validation -> human correction
           -> verification -> published timetable -> map/search/alerts
```

The core rule is: **unverified extraction never becomes authoritative public transit data.**

## Main Features

- Image, camera, and PDF timetable upload
- Gemini Vision extraction for multi-column boards (`FROM`, `ARRIVAL`, `DEPARTURE`, `TO`)
- Tesseract/OpenCV fallback extraction
- English and Malayalam data preservation
- Arrival/departure time normalization and validation
- Confidence scoring and field-level review warnings
- Source evidence, provenance, and correction audit history
- Authenticated users with upload ownership and history
- Human correction and publish workflow with success modal
- Published timetable data only in public stop APIs
- OpenStreetMap tiles with real bus-stop coordinates
- Stop search in English, Malayalam, and aliases
- Crowdsourced timetable contributions tied to usernames
- Scheduled timetable alerts and demo trigger
- GTFS-compatible API direction
- Responsive bilingual Next.js interface

## Architecture

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- React Leaflet with OpenStreetMap
- Lucide icons
- English/Malayalam locale dictionaries
- Vercel deployment target

### Backend

- FastAPI
- Background document processing lifecycle
- Gemini Vision API as the primary extractor
- OpenCV preprocessing and Tesseract fallback
- SQLite local persistence for development
- Supabase Auth and private Storage integration
- Render deployment target

### Processing states

```text
QUEUED -> PREPROCESSING -> OCR_PROCESSING -> STRUCTURING
       -> VALIDATING -> REVIEW_REQUIRED -> PUBLISHED
                              \-> PROCESSING_FAILED
```

## Important API Routes

```text
GET  /health
GET  /api/config
POST /api/auth/signup
POST /api/auth/login
POST /api/documents
GET  /api/documents/{id}/status
GET  /api/documents/{id}/extraction
PATCH /api/documents/{id}/extraction
POST /api/documents/{id}/verify
GET  /api/documents
GET  /api/stops/search?q=angamaly
GET  /api/stops/{id}/timetable
GET  /api/stops/nearby
POST /api/notifications/demo-trigger
GET  /api/gtfs/stops
```

## Local Development

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`. API docs are at `http://localhost:8000/docs`.

## Environment Variables

Backend variables are documented in [backend/.env.example](backend/.env.example). Required for the complete production flow:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
SUPABASE_STORAGE_BUCKET=timetables
TRANSITLENS_AUTH_SECRET=replace_with_a_long_random_secret
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the browser. Rotate any credential that has been committed or shared.

Install Tesseract with both `eng` and `mal` language packs for the OCR fallback. Gemini is recommended for difficult boards and scanned layouts.

## Deploy Backend to Render

1. Push the repository to GitHub.
2. In Render, choose **New + > Blueprint** and select the repository.
3. Render detects [render.yaml](render.yaml) and creates the `eppo-varum-api` service.
4. Add secret environment values in the Render dashboard: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. Set `CORS_ORIGINS` temporarily to the eventual Vercel URL, or update it after the frontend deployment.
6. Create the private Supabase Storage bucket named `timetables`.
7. Set the Render service health check path to `/health`.
8. Copy the deployed URL, for example `https://eppo-varum-api.onrender.com`.

Render uses a persistent disk for the local SQLite fallback. Supabase remains the recommended durable file storage and authentication provider.

## Deploy Frontend to Vercel

1. In Vercel, choose **Add New > Project** and import the repository.
2. Set the project root directory to `frontend`.
3. Vercel detects Next.js automatically. [vercel.json](vercel.json) contains the build defaults.
4. Add this production environment variable:

```env
NEXT_PUBLIC_API_URL=https://eppo-varum-api.onrender.com/api
```

5. Deploy and open the generated Vercel URL.
6. Add the Vercel URL to the backend CORS allowlist before production use.

Update the backend CORS configuration to include the exact Vercel origin, for example:

```env
CORS_ORIGINS=https://eppo-varum.vercel.app
```

## Supabase Setup

1. Create a Supabase project.
2. Enable Email/Password under Authentication providers.
3. Create a private Storage bucket called `timetables`.
4. Copy the project URL, anon key, and service-role key into Render environment variables.
5. Never add the service-role key to Vercel or frontend files.

Detailed OCR, Gemini, Supabase, and OpenStreetMap instructions are in [docs/SETUP.md](docs/SETUP.md).

## OpenStreetMap

The map uses OpenStreetMap tiles and visible attribution. No API key is required for development. For production traffic, use a hosted OSM tile provider or self-host tiles and comply with its usage policy. The application displays scheduled stop data, not real-time bus locations.

## Verification and Publication

1. A user uploads a source document.
2. Gemini extracts route, stop, arrival, departure, confidence, and evidence data.
3. The backend validates the result and stores it under the authenticated user.
4. The user edits uncertain values; original and corrected values are retained.
5. Publication re-runs validation and blocks invalid times, missing route endpoints, and inconsistent sequences.
6. Only `PUBLISHED` records appear in public timetable responses.

## Scope Boundaries

This project does not implement live GPS tracking, actual bus locations, live traffic prediction, ticketing, payments, driver tracking, or guaranteed arrival times. Alerts are explicitly based on scheduled timetable information.

## Validation

```powershell
cd backend
.venv\Scripts\python.exe -m compileall -q app

cd ..\frontend
npm run build
```

## Documentation

- [Backend specification](docs/BACKEND.md)
- [Setup and external services](docs/SETUP.md)
- [Render configuration](render.yaml)
- [Vercel configuration](vercel.json)
