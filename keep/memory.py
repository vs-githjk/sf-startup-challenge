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
    """Cognee 1.6.5 V2 API, imported lazily so local mode never loads it."""

    def __init__(self, store: Store):
        self.store = store

    async def remember(self, dataset, text):
        import cognee
        from cognee.modules.ingestion.data_types import TextData
        await cognee.remember(text, dataset_name=dataset, run_in_background=False,
                              self_improvement=False)
        # The run's item list holds other items of the dataset too; find ours by the content
        # hash Cognee itself gives this text.
        content_hash = TextData(text).get_identifier()
        for ds in await cognee.datasets.list_datasets():
            if ds.name == dataset:
                for d in await cognee.datasets.list_data(ds.id):
                    if content_hash in (d.content_hash, d.raw_content_hash):
                        return str(d.id)
        raise LookupError("remembered text not found in its Cognee dataset")

    async def recall(self, datasets, query, top):
        import cognee
        # Stored chunks, not an LLM answer, each tagged with the Cognee data id it came from.
        # ponytail: access control is off, so Cognee keeps one shared store and its dataset filter
        # leaks (and raises on unknown names); search all of it, keep-api scopes hits by its ledger.
        raw = await cognee.recall(query, cognee.SearchType.CHUNKS, top_k=top)
        out = []
        for i, r in enumerate(raw or []):
            if hasattr(r, "model_dump"):
                d = r.model_dump()
            else:
                d = dict(r) if isinstance(r, dict) else {"text": str(r)}
            text = next((str(d[f]) for f in TEXT_FIELDS if d.get(f)), "")
            if text:
                out.append({"text": text, "data_id": (d.get("metadata") or {}).get("data_id"),
                            "score": float(d.get("score") or 1.0 / (i + 1))})
        return out

    async def forget(self, cognee_data_id, dataset):
        if cognee_data_id:
            import cognee
            await cognee.forget(data_id=UUID(cognee_data_id), dataset=dataset)

    async def improve(self, dataset, feedback):
        import cognee
        # Without session ids every default stage skips; conflict review is the one that reads the graph.
        res = await cognee.improve(dataset=dataset, review_conflicts=True)
        return [{"stage": st.stage, "status": st.status, "reason": st.reason, "counts": st.counts}
                for st in res.stages]


def make_backend(store: Store) -> MemoryBackend:
    """Pick the backend from KEEP_BACKEND (default cognee)."""
    kind = os.environ.get("KEEP_BACKEND", "cognee").lower()
    return LocalBackend(store) if kind == "local" else CogneeBackend(store)
