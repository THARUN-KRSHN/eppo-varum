# eppo varum Setup | എപ്പോ വരും

## 1. Install dependencies

From the repository root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

cd ..\frontend
npm install
```

## 2. Install Tesseract OCR on Windows

The backend uses the Tesseract executable through `pytesseract`. Install Tesseract for Windows, then install both language packs:

- English: `eng`
- Malayalam: `mal`

The `tesseract.exe` directory must be on `PATH`. Verify it with:

```powershell
tesseract --version
tesseract --list-langs
```

The output must include `eng` and `mal`. If Tesseract is installed elsewhere, set `pytesseract.pytesseract.tesseract_cmd` in `backend/app/services/ocr_service.py` to the full executable path.

PDFs with a text layer are read directly. Scanned PDFs currently return a clear processing error until a PDF rasterizer/OCR worker is added.

## 3. Gemini Vision extraction

Gemini is the primary parser because it understands timetable columns such as `FROM`, `ARRIVAL`, `DEPARTURE`, and `TO`. The backend sends the original image or PDF directly to Gemini and validates the returned JSON before storage. Tesseract is used only when Gemini is unavailable or returns an invalid response.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `backend/.env.example` to `backend/.env`.
3. Set:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Do not put this key in frontend environment variables. Check `GET http://localhost:8000/api/config`; it reports only whether Gemini is configured and never returns the key.

## 4. Supabase Storage and Auth

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings > API**, copy the project URL and keys.
3. In **Storage**, create a private bucket named `timetables`.
4. Keep the bucket private. The backend uploads using the service-role key; that key must only exist in the backend environment.
5. In **Authentication > Providers > Email**, enable email/password sign-in. Disable email confirmation during local development, or keep it enabled and complete the confirmation link before login.
6. Copy `backend/.env.example` to `backend/.env` and set:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=timetables
```

With these values present, signup/login uses Supabase Auth and uploads use Supabase Storage. Without them, the project uses its local SQLite/password fallback so development still works.

## 5. OpenStreetMap

No API key is required for the basic map. The frontend uses the public OpenStreetMap tile URL:

```text
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

The map displays the curated stop coordinates returned by `/api/stops`. It is not a live GPS map. For production traffic, use a hosted OSM tile provider or self-host tiles and comply with the provider's attribution and usage policy. Keep the visible OpenStreetMap attribution enabled.

## 6. Run the application

Terminal 1:

```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000`. API documentation is at `http://localhost:8000/docs`.

## Working data flow

1. Sign up or sign in.
2. Upload a JPG, PNG, WEBP, or PDF.
3. The backend validates and stores the original file.
4. Gemini reads the original image/PDF and returns structured rows. OpenCV/Tesseract is the fallback path; PDFs without a text layer need Gemini or a PDF rasterizer.
5. The backend normalizes times, calculates confidence, stores evidence, and marks uncertain rows for review.
6. Edit fields in verification. Each correction stores original value, corrected value, user, and timestamp.
7. Publish only after validation. A success modal appears and the record becomes public.
8. The map reads real OSM tiles and stop coordinates. Public departures come only from published records.

No live bus location is represented. All alerts and times are explicitly scheduled timetable data.
