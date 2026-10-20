"""Wipe all memory before a clean run: everything in the Cognee container (graph, vectors,
metadata, via its REST API) and the keep ledger (.keep/: memories, events, drafts, usage).
Stop keep-api first so it does not write while we wipe.

    docker compose up -d neo4j cognee
    uv run python scripts/reset_memory.py
"""
import os
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from keep.store import data_dir  # noqa: E402


def main() -> None:
    url = os.environ.get("KEEP_URL", "http://127.0.0.1:8787")
    try:
        httpx.get(f"{url}/health", timeout=2)
        sys.exit(f"keep-api is running at {url}; stop it first")
    except httpx.HTTPError:
        pass
    cognee = os.environ.get("COGNEE_URL", "http://127.0.0.1:8000").rstrip("/")
    r = httpx.post(f"{cognee}/api/v1/forget", json={"everything": True}, timeout=300.0)
    r.raise_for_status()
    db = data_dir() / "keep.db"
    db.unlink(missing_ok=True)
    print(f"reset: Cognee at {cognee} emptied, ledger {db} removed")


if __name__ == "__main__":
    main()
