"""keep-api tests: local backend, temp data dirs, TestClient."""
import hashlib

import pytest
from fastapi.testclient import TestClient

from keep.api import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("KEEP_BACKEND", "local")
    monkeypatch.setenv("KEEP_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("KEEP_OUTBOX_DIR", str(tmp_path / "outbox"))
    monkeypatch.delenv("FLEXPRICE_API_KEY", raising=False)
    monkeypatch.setenv("KEEP_CREDITS_START", "1000")
    return TestClient(create_app())


def remember(c, text="Acme asked for SOC2 by March", ds="company", kind="promise"):
    r = c.post("/remember", json={"dataset": ds, "kind": kind, "text": text})
    assert r.status_code == 200
    return r.json()["data_id"]


def test_remember_then_recall(client):
    did = remember(client)
    r = client.post("/recall", json={"datasets": ["company"], "query": "SOC2 Acme", "top": 3})
    hits = r.json()["results"]
    assert hits[0]["data_id"] == did and hits[0]["kind"] == "promise"
    assert len(client.get("/memories", params={"dataset": "company"}).json()["memories"]) == 1


def test_forget_removes_from_recall(client):
    did = remember(client)
    assert client.post("/forget", json={"data_id": did}).status_code == 200
    r = client.post("/recall", json={"datasets": ["company"], "query": "SOC2 Acme"})
    assert r.json()["results"] == []
    assert client.get("/memories").json()["memories"] == []


def test_recall_scopes_by_ledger_when_backend_leaks(tmp_path, monkeypatch):
    """Cognee with access control off returns chunks from every dataset, without ids."""
    import keep.api

    class Leaky:
        def __init__(self, store):
            self.store = store

        async def remember(self, dataset, text):
            return None

        async def recall(self, datasets, query, top):
            rows = self.store.memories(include_forgotten=True)
            return [{"text": m["text"], "dataset": datasets[0], "data_id": None, "score": 1.0,
                     "kind": None} for m in rows + rows]

        async def forget(self, cognee_data_id, dataset):
            return None

    monkeypatch.setattr(keep.api, "make_backend", Leaky)
    monkeypatch.setenv("KEEP_DATA_DIR", str(tmp_path / "data"))
    c = TestClient(create_app())
    keep_id = remember(c, "Northline promise: Q3 retention by Oct 24", ds="rel_northline")
    gone = remember(c, "Northline promise: deck by Oct 20", ds="rel_northline")
    remember(c, "Acme will evaluate a competitor", ds="rel_acme", kind="risk")
    c.post("/forget", json={"data_id": gone})
    hits = c.post("/recall", json={"datasets": ["rel_northline"], "query": "promise"}).json()["results"]
    assert [(h["data_id"], h["dataset"], h["kind"]) for h in hits] == [(keep_id, "rel_northline", "promise")]


def draft(c, body="Hi Sarah, SOC2 is on track."):
    return c.post("/drafts", json={"to_name": "Sarah", "subject": "Update", "body": body}).json()["id"]


def test_send_refused_after_edit(client):
    did = draft(client)
    client.post(f"/drafts/{did}/approve")
    client.put(f"/drafts/{did}", json={"body": "Hi Sarah, we are SOC2 certified."})
    r = client.post(f"/drafts/{did}/send")
    assert r.status_code == 409 and did in r.json()["detail"]


def test_send_writes_eml_with_hash(client, tmp_path):
    body = "Hi Sarah, SOC2 is on track."
    did = draft(client, body)
    assert client.post(f"/drafts/{did}/send").status_code == 409  # not approved yet
    digest = client.post(f"/drafts/{did}/approve").json()["approved_sha256"]
    assert digest == hashlib.sha256(body.encode()).hexdigest()
    assert client.post(f"/drafts/{did}/send").status_code == 200
    eml = (tmp_path / "outbox" / f"{did}.eml").read_text()
    assert body in eml and digest in eml


@pytest.mark.parametrize("bad", [
    {"dataset": "Bad Name!", "kind": "promise", "text": "x"},
    {"dataset": "company", "kind": "gossip", "text": "x"},
    {"dataset": "company", "kind": "risk", "text": "x" * 8001},
])
def test_validation_rejects(client, bad):
    assert client.post("/remember", json=bad).status_code == 422


def test_gate_denies_when_credits_low(client, monkeypatch):
    assert client.get("/gate/deep_research").json()["allow"] is True
    monkeypatch.setenv("KEEP_CREDITS_START", "150")
    g = client.get("/gate/deep_research").json()
    assert g["allow"] is False and g["cost"] == 200 and g["balance"] == 150


def test_cost_aggregates_per_agent(client):
    for tin, tout in [(1000, 500), (2000, 0)]:
        client.post("/cost", json={"agent": "drafter", "harness": "codex", "room": "hq",
                                   "tokens_in": tin, "tokens_out": tout})
    client.post("/cost", json={"agent": "brain", "tasks": 1})
    agents = {a["agent"]: a for a in client.get("/usage").json()["agents"]}
    assert agents["drafter"]["tokens_in"] == 3000 and agents["drafter"]["tokens_out"] == 500
    assert agents["brain"]["tasks"] == 1
    assert client.get("/credits").json()["balance"] == 996.5
    types = [e["type"] for e in client.get("/events").json()["events"]]
    assert types.count("cost") == 3
