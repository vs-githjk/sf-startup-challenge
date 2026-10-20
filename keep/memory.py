"""Memory backends: Cognee (real) and Local (keyword overlap, no LLM needed)."""
import os
import re
from typing import Protocol
from uuid import UUID

from .store import Store

TEXT_FIELDS = ("text", "content", "answer", "search_result")


def tokens(s: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", s.lower()))


class MemoryBackend(Protocol):
    async def remember(self, dataset: str, text: str) -> str | None: ...
    async def recall(self, datasets: list[str], query: str, top: int) -> list[dict]: ...
    async def forget(self, cognee_data_id: str | None) -> None: ...
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

    async def forget(self, cognee_data_id):
        return None

    async def improve(self, dataset, feedback):
        return None


class CogneeBackend:
    """Cognee 1.6.5 V2 API, imported lazily so local mode never loads it."""

    def __init__(self, store: Store):
        self.store = store

    async def remember(self, dataset, text):
        import cognee
        res = await cognee.remember(text, dataset_name=dataset, run_in_background=False,
                                    self_improvement=False)
        for item in getattr(res, "items", None) or []:
            if isinstance(item, dict) and item.get("id"):
                return str(item["id"])
        return await self._newest_data_id(dataset)

    async def _newest_data_id(self, dataset):
        import cognee
        for ds in await cognee.datasets.list_datasets():
            if getattr(ds, "name", None) == dataset:
                data = await cognee.datasets.list_data(ds.id)
                if data:
                    newest = max(data, key=lambda d: str(getattr(d, "created_at", "") or ""))
                    return str(newest.id)
        return None

    async def recall(self, datasets, query, top):
        import cognee
        raw = await cognee.recall(query, datasets=datasets, top_k=top)
        out = []
        for i, r in enumerate(raw or []):
            if hasattr(r, "model_dump"):
                d = r.model_dump()
            else:
                d = dict(r) if isinstance(r, dict) else {"text": str(r)}
            text = next((str(d[f]) for f in TEXT_FIELDS if d.get(f)), "")
            if text:
                out.append({"text": text, "dataset": d.get("dataset_name") or datasets[0],
                            "data_id": None, "score": float(d.get("score") or 1.0 / (i + 1)),
                            "kind": None})
        return out

    async def forget(self, cognee_data_id):
        if cognee_data_id:
            import cognee
            await cognee.forget(data_id=UUID(cognee_data_id))

    async def improve(self, dataset, feedback):
        import cognee
        await cognee.improve(dataset=dataset)


def make_backend(store: Store) -> MemoryBackend:
    """Pick the backend from KEEP_BACKEND (default cognee)."""
    kind = os.environ.get("KEEP_BACKEND", "cognee").lower()
    return LocalBackend(store) if kind == "local" else CogneeBackend(store)
