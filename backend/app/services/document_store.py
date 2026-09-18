import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from ..core.config import DATABASE_PATH


class DocumentStore:
    def __init__(self) -> None:
        self.path = Path(DATABASE_PATH)
        if not self.path.is_absolute():
            self.path = Path(__file__).resolve().parents[3] / self.path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._initialize()

    def _connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connection() as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY, uploaded_by TEXT, status TEXT NOT NULL,
                    file_type TEXT NOT NULL, original_filename TEXT NOT NULL,
                    file_size INTEGER NOT NULL, path TEXT NOT NULL, storage_path TEXT,
                    extraction TEXT, failure_reason TEXT, failure_stage TEXT,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                )
            """)

    def create(self, document: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        document.setdefault("created_at", now)
        document.setdefault("updated_at", now)
        with self._lock, self._connection() as connection:
            connection.execute("""
                INSERT INTO documents (id, uploaded_by, status, file_type, original_filename,
                file_size, path, storage_path, extraction, failure_reason, failure_stage,
                created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (document["id"], document.get("uploaded_by"), document["status"], document["file_type"],
                  document["original_filename"], document["file_size"], document["path"], document.get("storage_path"),
                  json.dumps(document.get("extraction"), ensure_ascii=False) if document.get("extraction") else None,
                  document.get("failure_reason"), document.get("failure_stage"), document["created_at"], document["updated_at"]))
        return document

    def get(self, document_id: str) -> dict[str, Any] | None:
        with self._connection() as connection:
            row = connection.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if row is None:
            return None
        document = dict(row)
        if document.get("extraction"):
            document["extraction"] = json.loads(document["extraction"])
        return document

    def update(self, document_id: str, **changes: Any) -> dict[str, Any] | None:
        document = self.get(document_id)
        if document is None:
            return None
        document.update(changes)
        document["updated_at"] = datetime.now(timezone.utc).isoformat()
        extraction = document.get("extraction")
        with self._lock, self._connection() as connection:
            connection.execute("""
                UPDATE documents SET uploaded_by=?, status=?, file_type=?, original_filename=?,
                file_size=?, path=?, storage_path=?, extraction=?, failure_reason=?, failure_stage=?, updated_at=?
                WHERE id=?
            """, (document.get("uploaded_by"), document["status"], document["file_type"], document["original_filename"],
                  document["file_size"], document["path"], document.get("storage_path"), json.dumps(extraction, ensure_ascii=False) if extraction else None,
                  document.get("failure_reason"), document.get("failure_stage"), document["updated_at"], document_id))
        return document

    def list_by_user(self, user_id: str) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = connection.execute("SELECT * FROM documents WHERE uploaded_by = ? ORDER BY created_at DESC", (user_id,)).fetchall()
        documents = []
        for row in rows:
            document = dict(row)
            if document.get("extraction"):
                document["extraction"] = json.loads(document["extraction"])
            documents.append(document)
        return documents


documents = DocumentStore()
