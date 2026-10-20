"""keep-api: one process owns Cognee; agents talk to it over HTTP."""
import asyncio
import hashlib
import logging
import os
import re
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import billing
from .memory import make_backend
from .store import Store, now

log = logging.getLogger("keep.api")
DATASET = r"^[a-z0-9_]{1,64}$"
Kind = Literal["promise", "claim", "risk", "decision", "finding", "correction"]
Name = Field(min_length=1, max_length=120)
Short = Field(default="", max_length=120)
UUID_RE = re.compile(r"^[0-9a-f-]{36}$")
# ponytail: candidates pulled from Cognee before ledger scoping; facts ranked below this are
# missed once memory holds more chunks. Upgrade: node_set per dataset + node_name filter.
RECALL_POOL = 100


class RememberIn(BaseModel):
    dataset: str = Field(pattern=DATASET)
    kind: Kind
    text: str = Field(min_length=1, max_length=8000)
    source: str | None = Field(default=None, max_length=200)


class RecallIn(BaseModel):
    datasets: list[str] = Field(min_length=1, max_length=10)
    query: str = Field(min_length=1, max_length=1000)
    top: int = Field(default=5, ge=1, le=50)


class ForgetIn(BaseModel):
    data_id: str = Field(min_length=1, max_length=64)


class ImproveIn(BaseModel):
    dataset: str = Field(pattern=DATASET)
    feedback: str = Field(max_length=2000)


class DraftIn(BaseModel):
    to_name: str = Name
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=8000)


class DraftEdit(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


class CostIn(BaseModel):
    agent: str = Name
    harness: str = Short
    room: str = Short
    tokens_in: int = Field(default=0, ge=0, le=100_000_000)
    tokens_out: int = Field(default=0, ge=0, le=100_000_000)
    tasks: int = Field(default=0, ge=0, le=100_000)
    usd: float | None = Field(default=None, ge=0, le=100_000)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def create_app() -> FastAPI:
    """Build the app; env is read here so tests can point at temp dirs."""
    store = Store()
    backend = make_backend(store)
    wallet = billing.Wallet(store)
    outbox = Path(os.environ.get("KEEP_OUTBOX_DIR", "outbox")).resolve()
    customer = os.environ.get("FLEXPRICE_CUSTOMER_ID", "lumen")
    # Concurrent first writes to a dataset race on its creation in Cognee (PermissionDeniedError).
    write_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    @asynccontextmanager
    async def lifespan(_app):
        if os.environ.get("KEEP_BACKEND", "cognee") == "cognee" and os.environ.get("KEEP_WARMUP") == "1":
            cid = await backend.remember("keep_warmup", "Keep warm-up note.")  # same loop as requests
            await backend.forget(cid, "keep_warmup")  # stays warm, leaves no stray node in Neo4j
        yield

    app = FastAPI(title="keep-api", lifespan=lifespan)

    def draft_or_404(draft_id: str) -> dict:
        rows = store.run("SELECT * FROM drafts WHERE id=?", (draft_id,)) if UUID_RE.match(draft_id) else []
        if not rows:
            raise HTTPException(404, "unknown draft")
        return rows[0]

    @app.get("/health")
    def health():
        return {"ok": True, "backend": type(backend).__name__}

    @app.post("/remember")
    async def remember(b: RememberIn):
        try:
            async with write_locks[b.dataset]:
                cid = await backend.remember(b.dataset, b.text)
        except Exception as exc:
            log.warning("remember failed: %s", type(exc).__name__)
            raise HTTPException(502, "memory backend failed") from exc
        mid = store.add_memory(b.dataset, b.kind, b.text, b.source, cid)
        store.event("remember", "", {"data_id": mid, "dataset": b.dataset, "kind": b.kind})
        return {"data_id": mid}

    @app.post("/recall")
    async def recall(b: RecallIn):
        for d in b.datasets:
            if not re.match(DATASET, d):
                raise HTTPException(422, "bad dataset name")
        live = [m for ds in b.datasets for m in store.memories(dataset=ds)]
        try:
            # nothing live in these datasets: skip Cognee (it raises on names it never saw)
            raw = await backend.recall(b.datasets, b.query, RECALL_POOL) if live else []
        except Exception as exc:
            log.warning("recall failed: %s", type(exc).__name__)
            raise HTTPException(502, "memory backend failed") from exc
        # The ledger is the scope: hits from other datasets, forgotten facts and dupes drop out.
        by_id: dict[str, dict] = {}
        for m in live:
            by_id.setdefault(m["id"], m)
            if m["cognee_data_id"]:
                by_id.setdefault(m["cognee_data_id"], m)
        results, seen = [], set()
        for r in raw:
            hit = by_id.get(r["data_id"])
            if hit and hit["id"] not in seen:
                seen.add(hit["id"])
                results.append({**r, "data_id": hit["id"], "kind": hit["kind"], "dataset": hit["dataset"]})
        store.event("recall", "", {"datasets": b.datasets, "query": b.query[:200], "n": len(results)})
        return {"results": results[: b.top]}

    @app.post("/forget")
    async def forget(b: ForgetIn):
        m = store.find_memory(b.data_id)
        if not m:
            raise HTTPException(404, "unknown data_id")
        store.mark_forgotten(m["id"])
        cid = m["cognee_data_id"]
        # One text is one Cognee item however often or wherever it was remembered: keep it while
        # any copy is live, then drop it from every dataset that held a copy.
        copies = store.run("SELECT dataset, forgotten_at FROM memories WHERE cognee_data_id=?", (cid,))
        if cid and all(c["forgotten_at"] for c in copies):
            for ds in sorted({c["dataset"] for c in copies}):
                try:
                    await backend.forget(cid, ds)
                except Exception as exc:  # ledger already hides it from recall
                    log.warning("backend forget failed: %s", type(exc).__name__)
        store.event("forget", "", {"data_id": m["id"], "dataset": m["dataset"]})
        return {"forgotten": m["id"]}

    @app.post("/improve")
    async def improve(b: ImproveIn):
        if not store.memories(dataset=b.dataset, include_forgotten=True):
            raise HTTPException(404, "nothing remembered in this dataset")
        try:
            async with write_locks[b.dataset]:
                stages = await backend.improve(b.dataset, b.feedback)
        except Exception as exc:
            log.warning("improve failed: %s", type(exc).__name__)
            raise HTTPException(502, "memory backend failed") from exc
        store.event("improve", "", {"dataset": b.dataset, "feedback": b.feedback[:200], "stages": stages})
        return {"ok": True, "stages": stages}

    @app.get("/memories")
    def memories(dataset: str | None = None, kind: Kind | None = None):
        if dataset and not re.match(DATASET, dataset):
            raise HTTPException(422, "bad dataset name")
        return {"memories": store.memories(dataset=dataset, kind=kind)}

    @app.post("/drafts")
    def new_draft(b: DraftIn):
        did = str(uuid.uuid4())
        store.run("INSERT INTO drafts(id,to_name,subject,body,status) VALUES(?,?,?,?,'pending')",
                  (did, b.to_name, b.subject, b.body))
        store.event("draft", "", {"id": did, "to": b.to_name})
        return {"id": did}

    @app.get("/drafts")
    def list_drafts():
        return {"drafts": store.run("SELECT * FROM drafts ORDER BY rowid")}

    @app.put("/drafts/{draft_id}")
    def edit_draft(draft_id: str, b: DraftEdit):
        draft_or_404(draft_id)
        store.run("UPDATE drafts SET body=? WHERE id=?", (b.body, draft_id))
        store.event("draft_edit", "", {"id": draft_id})
        return {"id": draft_id}

    @app.post("/drafts/{draft_id}/approve")
    def approve(draft_id: str):
        d = draft_or_404(draft_id)
        digest = sha(d["body"])
        store.run("UPDATE drafts SET status='approved', approved_sha256=?, approved_at=? WHERE id=?",
                  (digest, now(), draft_id))
        store.event("approve", "", {"id": draft_id, "sha256": digest})
        return {"id": draft_id, "approved_sha256": digest}

    @app.post("/drafts/{draft_id}/send")
    def send(draft_id: str):
        d = draft_or_404(draft_id)
        if d["status"] != "approved" or d["approved_sha256"] != sha(d["body"]):
            store.event("send_refused", "", {"id": draft_id})
            raise HTTPException(409, f"draft {draft_id} is pending: body is not the approved text")
        outbox.mkdir(parents=True, exist_ok=True)
        path = outbox / f"{draft_id}.eml"
        path.write_text(f"To: {d['to_name']}\nSubject: {d['subject']}\nX-Keep-Approved-SHA256: "
                        f"{d['approved_sha256']}\n\n{d['body']}\n", encoding="utf-8")
        store.run("UPDATE drafts SET status='sent', sent_at=? WHERE id=?", (now(), draft_id))
        synced = billing.send_event("approved_outbound", customer, {"draft_id": draft_id})
        wallet.spend(billing.ACTION_COST["outbound"], "outbound")
        store.event("send", "", {"id": draft_id, "flexprice_synced": synced})
        return {"id": draft_id, "path": str(path), "sha256": d["approved_sha256"]}

    @app.post("/cost")
    def cost(b: CostIn):
        usd = b.usd if b.usd is not None else 0.0
        store.run("INSERT INTO usage(ts,agent,harness,room,tokens_in,tokens_out,tasks,usd) "
                  "VALUES(?,?,?,?,?,?,?,?)",
                  (now(), b.agent, b.harness, b.room, b.tokens_in, b.tokens_out, b.tasks, usd))
        synced = True
        props = {"agent": b.agent, "harness": b.harness, "room": b.room}
        if b.tokens_in or b.tokens_out:
            synced &= billing.send_event("agent_tokens", customer,
                                         {**props, "tokens": b.tokens_in + b.tokens_out})
            wallet.spend(billing.token_credits(b.tokens_in, b.tokens_out), "tokens", b.agent)
        if b.tasks:
            synced &= billing.send_event("agent_tasks", customer, {**props, "tasks": b.tasks})
        store.event("cost", b.agent, {"tokens_in": b.tokens_in, "tokens_out": b.tokens_out,
                                      "tasks": b.tasks, "flexprice_synced": synced})
        return {"ok": True, "flexprice_synced": synced, "balance": wallet.balance()}

    @app.get("/usage")
    def usage():
        rows = store.run("SELECT agent, MAX(harness) AS harness, SUM(tokens_in) AS tokens_in, "
                         "SUM(tokens_out) AS tokens_out, SUM(tasks) AS tasks, SUM(usd) AS usd "
                         "FROM usage GROUP BY agent ORDER BY agent")
        return {"agents": rows}

    @app.get("/credits")
    def credits():
        return {"balance": wallet.balance(), "start": wallet.start()}

    @app.get("/gate/{feature}")
    def gate(feature: str):
        return wallet.gate(feature)

    @app.get("/events")
    def events(since: int = 0):
        return {"events": store.events(since)}

    ui = Path("ui")
    if ui.is_dir():  # mounted last so API routes win
        app.mount("/", StaticFiles(directory=ui.resolve(), html=True), name="ui")
    return app


def main() -> None:
    import uvicorn
    uvicorn.run(create_app(), host="127.0.0.1", port=int(os.environ.get("KEEP_PORT", "8787")),
                reload=False, log_level="info")


if __name__ == "__main__":
    main()
