"""Memory backends: Cognee (real) and Local (keyword overlap, no LLM needed)."""
import hashlib
import os
import re
from typing import Protocol

import httpx

from .store import Store

TEXT_FIELDS = ("text", "content", "answer", "search_result")


def tokens(s: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", s.lower()))


class MemoryBackend(Protocol):
    async def remember(self, dataset: str, text: str) -> str | None: ...
    async def recall(self, datasets: list[str], query: str, top: int) -> list[dict]:
        """Hits as {text, data_id, score}; data_id is a ledger id or a Cognee data id."""
    async def forget(self, cognee_data_id: str | None, dataset: str) -> None: ...
    async def improve(self, dataset: str, feedback: str) -> list[dict]: ...


class LocalBackend:
    """Deterministic keyword-overlap recall over the ledger."""

    def __init__(self, store: Store):
        self.store = store

    async def remember(self, dataset, text):
        return None

    async def recall(self, datasets, query, top):
        q, out = tokens(query), []
        for ds in datasets:
            for m in self.store.memories(dataset=ds):
                score = len(q & tokens(m["text"])) / (len(q) or 1)
                if score > 0:
                    out.append({"text": m["text"], "dataset": ds, "data_id": m["id"],
                                "score": round(score, 4), "kind": m["kind"]})
        out.sort(key=lambda r: (-r["score"], r["data_id"]))
        return out[:top]

    async def forget(self, cognee_data_id, dataset):
        return None

    async def improve(self, dataset, feedback):
        return []


class CogneeBackend:
    """httpx client for the Cognee REST server (its own container, see docker-compose.yml).

    Cognee runs with ENABLE_BACKEND_ACCESS_CONTROL=false, so its endpoints need no token and
    every call acts as its single default user. It is bound to 127.0.0.1 only.
    """

    def __init__(self, store: Store, base_url: str | None = None,
                 transport: httpx.AsyncBaseTransport | None = None):
        self.store = store
        self.base_url = (base_url or os.environ.get("COGNEE_URL", "http://127.0.0.1:8000")).rstrip("/")
        self.transport = transport

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base_url, timeout=300.0, transport=self.transport)

    async def remember(self, dataset, text):
        form = [("datasetName", dataset), ("raw_data", text), ("run_in_background", "false"),
                ("self_improvement", "false")]
        async with self._client() as c:
            r = await c.post("/api/v1/remember", files=[(k, (None, v)) for k, v in form])
            r.raise_for_status()
            # The run's item list holds other items of the dataset too; find ours by the name
            # Cognee 1.6.5 names a text item "text_<md5 of the utf-8 text>" (older builds added ".txt").
            name = "text_" + hashlib.md5(text.encode("utf-8"), usedforsecurity=False).hexdigest()
            r = await c.get("/api/v1/datasets")
            r.raise_for_status()
            for ds in r.json():
                if ds.get("name") == dataset:
                    d = await c.get(f"/api/v1/datasets/{ds['id']}/data", params={"limit": 1000})
                    d.raise_for_status()
                    for row in d.json():
                        if row.get("name") in (name, name + ".txt"):
                            return str(row["id"])
        raise LookupError("remembered text not found in its Cognee dataset")

    async def recall(self, datasets, query, top):
        # Stored chunks, not an LLM answer, each tagged with the Cognee data id it came from.
        # Access control is off, so Cognee keeps one shared store and its dataset filter leaks
        # (and errors on unknown names): search all of it, keep-api scopes hits by its ledger.
        async with self._client() as c:
            r = await c.post("/api/v1/recall", json={"query": query, "searchType": "CHUNKS",
                                                     "topK": top})
            r.raise_for_status()
            raw = r.json()
        out = []
        for i, d in enumerate(raw if isinstance(raw, list) else []):
            d = d if isinstance(d, dict) else {"text": str(d)}
            if d.get("source") == "system":  # e.g. "memory is still warming up", not a stored fact
                continue
            text = next((str(d[f]) for f in TEXT_FIELDS if d.get(f)), "")
            if text:
                out.append({"text": text, "data_id": (d.get("metadata") or {}).get("data_id"),
                            "score": float(d.get("score") or 1.0 / (i + 1))})
        return out

    async def forget(self, cognee_data_id, dataset):
        if cognee_data_id:
            async with self._client() as c:
                r = await c.post("/api/v1/forget", json={"dataId": cognee_data_id, "dataset": dataset})
                r.raise_for_status()

    async def improve(self, dataset, feedback):
        # Without session ids every default stage skips; conflict review is the one that reads the graph.
        async with self._client() as c:
            r = await c.post("/api/v1/improve", json={"datasetName": dataset, "reviewConflicts": True})
            r.raise_for_status()
            stages = r.json().get("stages") or []
        return [{"stage": st.get("stage"), "status": st.get("status"), "reason": st.get("reason"),
                 "counts": st.get("counts") or {}} for st in stages]


def make_backend(store: Store) -> MemoryBackend:
    """Pick the backend from KEEP_BACKEND (default cognee)."""
    kind = os.environ.get("KEEP_BACKEND", "cognee").lower()
    return LocalBackend(store) if kind == "local" else CogneeBackend(store)
