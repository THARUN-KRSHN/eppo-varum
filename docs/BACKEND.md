# Backend implementation notes

The backend is structured around the finalized eppo varum (എപ്പോ വരും) flow: upload → preprocessing → Gemini vision/OCR → table/semantic extraction → normalization → confidence → human verification → publication → map/search/alerts/GTFS.

`app/services/pipeline.py` currently provides a deterministic demo extraction so the product can run without paid AI credentials. Replace that adapter with PaddleOCR + a structured vision/LLM provider for production extraction. Keep raw OCR evidence, bounding boxes, source document IDs, confidence and correction audit records in the production database.

Recommended production database entities: users, documents, OCR results, routes, stops, stop aliases, services, trips, stop_times, extractions, verification_records, contributions, notification_subscriptions, notification_events.

Important invariants: unverified extraction is never public; missing values remain null; timetable time is scheduled time, never live location; ambiguous stop matches require review; duplicate notifications are prevented with an event key; timetable validity/version must be preserved.
