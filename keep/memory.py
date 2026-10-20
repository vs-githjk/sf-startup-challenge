"""Memory backends: Cognee (real) and Local (keyword overlap, no LLM needed)."""
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
    async def recall(self, datasets: list[str], query: str, top: int) -> list[dict]: ...
    async def forget(self, cognee_data_id: str | None, dataset: str | None = None) -> None: ...
    async def improve(self, dataset: str, feedback: str) -> None: ...


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

    async def forget(self, cognee_data_id, dataset=None):
        return None

    async def improve(self, dataset, feedback):
        return None


class CogneeBackend:
    """httpx client for the Cognee REST server (separate container, see docker-compose.yml).

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
            for item in r.json().get("items") or []:
                if isinstance(item, dict) and item.get("id"):
                    return str(item["id"])
            return await self._newest_data_id(c, dataset)

    @staticmethod
    async def _newest_data_id(c: httpx.AsyncClient, dataset: str) -> str | None:
        r = await c.get("/api/v1/datasets")
        r.raise_for_status()
        for ds in r.json():
            if ds.get("name") == dataset:
                d = await c.get(f"/api/v1/datasets/{ds['id']}/data")
                d.raise_for_status()
                rows = d.json()
                if rows:
                    key = lambda x: str(x.get("createdAt") or x.get("created_at") or "")  # noqa: E731
                    return str(max(rows, key=key)["id"])
        return None

    async def recall(self, datasets, query, top):
        async with self._client() as c:
            r = await c.post("/api/v1/recall", json={"query": query, "datasets": datasets,
                                                     "topK": top})
            r.raise_for_status()
            raw = r.json()
        out = []
        for i, d in enumerate(raw if isinstance(raw, list) else []):
            d = d if isinstance(d, dict) else {"text": str(d)}
            text = next((str(d[f]) for f in TEXT_FIELDS if d.get(f)), "")
            if text:
                ds = d.get("dataset_name") or d.get("datasetName") or datasets[0]
                out.append({"text": text, "dataset": ds, "data_id": None,
                            "score": float(d.get("score") or 1.0 / (i + 1)), "kind": None})
        return out

    async def forget(self, cognee_data_id, dataset=None):
        if not (cognee_data_id and dataset):
            return
        async with self._client() as c:
            r = await c.post("/api/v1/forget", json={"dataId": cognee_data_id, "dataset": dataset})
            r.raise_for_status()

    async def improve(self, dataset, feedback):
        async with self._client() as c:
            r = await c.post("/api/v1/improve", json={"datasetName": dataset})
            r.raise_for_status()


def make_backend(store: Store) -> MemoryBackend:
    """Pick the backend from KEEP_BACKEND (default cognee)."""
    kind = os.environ.get("KEEP_BACKEND", "cognee").lower()
    return LocalBackend(store) if kind == "local" else CogneeBackend(store)
