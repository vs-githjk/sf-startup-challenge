"""SQLite ledger for memories, events, drafts and usage."""
import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .paths import confine

SCHEMA = """
CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY, dataset TEXT, kind TEXT, text TEXT,
  source TEXT, cognee_data_id TEXT, created_at TEXT, forgotten_at TEXT);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, type TEXT,
  agent TEXT, payload_json TEXT);
CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY, to_name TEXT, subject TEXT, body TEXT,
  status TEXT, approved_sha256 TEXT, approved_at TEXT, sent_at TEXT);
CREATE TABLE IF NOT EXISTS usage(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, agent TEXT,
  harness TEXT, room TEXT, tokens_in INTEGER, tokens_out INTEGER, tasks INTEGER, usd REAL);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def data_dir() -> Path:
    return confine(os.environ.get("KEEP_DATA_DIR", ".keep"))


class Store:
    """Thread-safe wrapper over one SQLite file."""

    def __init__(self, directory: Path | None = None):
        self.dir = Path(directory).resolve() if directory else data_dir()
        self.dir.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.dir / "keep.db", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        with self.lock:
            self.db.executescript(SCHEMA)

    def run(self, sql: str, args: tuple = ()) -> list[dict]:
        """Execute one parameterised statement and return rows as dicts."""
        with self.lock:
            cur = self.db.execute(sql, args)
            rows = [dict(r) for r in cur.fetchall()]
            self.db.commit()
            return rows

    def add_memory(self, dataset, kind, text, source, cognee_data_id=None) -> str:
        mid = str(uuid.uuid4())
        self.run("INSERT INTO memories VALUES(?,?,?,?,?,?,?,NULL)",
                 (mid, dataset, kind, text, source, cognee_data_id, now()))
        return mid

    def memories(self, dataset=None, kind=None, include_forgotten=False) -> list[dict]:
        sql, args = "SELECT * FROM memories WHERE 1=1", []
        if dataset:
            sql += " AND dataset=?"
            args.append(dataset)
        if kind:
            sql += " AND kind=?"
            args.append(kind)
        if not include_forgotten:
            sql += " AND forgotten_at IS NULL"
        return self.run(sql + " ORDER BY created_at", tuple(args))

    def find_memory(self, data_id: str) -> dict | None:
        rows = self.run("SELECT * FROM memories WHERE id=? OR cognee_data_id=?", (data_id, data_id))
        return rows[0] if rows else None

    def mark_forgotten(self, mid: str) -> None:
        self.run("UPDATE memories SET forgotten_at=? WHERE id=?", (now(), mid))

    def event(self, type_: str, agent: str = "", payload: dict | None = None) -> int:
        """Append an event and return its id."""
        self.run("INSERT INTO events(ts,type,agent,payload_json) VALUES(?,?,?,?)",
                 (now(), type_, agent, json.dumps(payload or {}, default=str)))
        return self.run("SELECT max(id) AS m FROM events")[0]["m"]

    def events(self, since: int = 0, limit: int = 200, type_: str | None = None) -> list[dict]:
        sql, args = "SELECT * FROM events WHERE id>?", [since]
        if type_:
            sql += " AND type=?"
            args.append(type_)
        rows = self.run(sql + " ORDER BY id LIMIT ?", (*args, limit))
        for r in rows:
            r["payload"] = json.loads(r.pop("payload_json"))
        return rows
