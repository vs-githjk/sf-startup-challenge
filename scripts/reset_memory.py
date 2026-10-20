"""Wipe all memory before a clean run: Cognee (Neo4j graph, LanceDB vectors, metadata) and the
keep ledger (.keep/: memories, events, drafts, usage). Stop keep-api first.

    uv run python scripts/reset_memory.py
"""
import asyncio
import os
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from keep.store import data_dir  # noqa: E402


async def main() -> None:
    url = os.environ.get("KEEP_URL", "http://127.0.0.1:8787")
    try:
        httpx.get(f"{url}/health", timeout=2)
        sys.exit(f"keep-api is running at {url}; stop it first (only one process may touch Cognee)")
    except httpx.HTTPError:
        pass
    import cognee
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)
    db = data_dir() / "keep.db"
    db.unlink(missing_ok=True)
    print(f"reset: Cognee stores pruned, ledger {db} removed")


if __name__ == "__main__":
    asyncio.run(main())
