"""keep-api tests: local backend, temp data dirs, TestClient."""
import hashlib
import uuid

import pytest
from fastapi.testclient import TestClient

from keep.api import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("KEEP_BACKEND", "local")
    monkeypatch.setenv("KEEP_ROOT", str(tmp_path))
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


class FakeCognee:
    """Cognee with access control off: one shared store, a text's id comes from its content (same
    text, same item), recall ignores datasets, raises on recall when it holds nothing."""

    def __init__(self, store):
        self.items, self.forgets, self.recalls = {}, [], 0

    async def remember(self, dataset, text):
        cid = str(uuid.uuid5(uuid.NAMESPACE_OID, text))
        self.items[cid] = text
        return cid

    async def recall(self, datasets, query, top):
        self.recalls += 1
        if not self.items:
            raise LookupError("DatasetNotFoundError")
        return [{"text": t, "data_id": cid, "score": 1.0} for cid, t in self.items.items()]

    async def forget(self, cognee_data_id, dataset):
        self.forgets.append((cognee_data_id, dataset))

    async def improve(self, dataset, feedback):
        return [{"stage": "review_conflicts", "status": "completed", "reason": None, "counts": {}}]


@pytest.fixture
def fake(tmp_path, monkeypatch):
    import keep.api
    backends = []
    monkeypatch.setattr(keep.api, "make_backend", lambda store: backends.append(FakeCognee(store)) or backends[-1])
    monkeypatch.setenv("KEEP_ROOT", str(tmp_path))
    monkeypatch.setenv("KEEP_DATA_DIR", str(tmp_path / "data"))
    c = TestClient(create_app())
    return c, backends[0]


def hits(c, datasets, query="promise"):
    r = c.post("/recall", json={"datasets": datasets, "query": query})
    assert r.status_code == 200
    return [(h["data_id"], h["dataset"], h["kind"]) for h in r.json()["results"]]


def test_recall_scopes_by_ledger_when_backend_leaks(fake):
    c, _ = fake
    keep_id = remember(c, "Northline promise: Q3 retention by Oct 24", ds="rel_northline")
    gone = remember(c, "Northline promise: deck by Oct 20", ds="rel_northline")
    remember(c, "Acme will evaluate a competitor", ds="rel_acme", kind="risk")
    c.post("/forget", json={"data_id": gone})
    assert hits(c, ["rel_northline"]) == [(keep_id, "rel_northline", "promise")]


def test_recall_unknown_datasets_skip_backend(fake):
    c, cognee = fake
    assert hits(c, ["rel_never"]) == [] and cognee.recalls == 0
    a = remember(c, "Orion Bank SOC2 report by Dec 5", ds="rel_orion")
    assert hits(c, ["rel_orion", "rel_never"]) == [(a, "rel_orion", "promise")]


def test_overlapping_texts_keep_their_own_kind(fake):
    c, _ = fake
    remember(c, "Pelican Air is a churn risk.", ds="rel_pelican", kind="risk")
    long_id = remember(c, "Pelican Air is a churn risk. They asked for a Spanish UI.", ds="rel_pelican", kind="claim")
    assert (long_id, "rel_pelican", "claim") in hits(c, ["rel_pelican"])
    assert len(hits(c, ["rel_pelican"])) == 2


def test_forget_keeps_cognee_item_while_a_copy_is_live(fake):
    c, cognee = fake
    text = "Kite Freight asked for a Slack integration by Dec 12."
    d1, d2 = remember(c, text, ds="rel_kite"), remember(c, text, ds="rel_kite")
    other = remember(c, text, ds="company")
    c.post("/forget", json={"data_id": d1})
    assert hits(c, ["rel_kite"]) == [(d2, "rel_kite", "promise")] and cognee.forgets == []
    c.post("/forget", json={"data_id": d2})
    assert hits(c, ["rel_kite"]) == [] and hits(c, ["company"]) == [(other, "company", "promise")]
    assert cognee.forgets == []
    c.post("/forget", json={"data_id": other})
    cid = str(uuid.uuid5(uuid.NAMESPACE_OID, text))
    assert sorted(cognee.forgets) == [(cid, "company"), (cid, "rel_kite")]


def test_improve_reports_stages_and_rejects_empty_dataset(fake):
    c, _ = fake
    assert c.post("/improve", json={"dataset": "rel_never", "feedback": "x"}).status_code == 404
    remember(c, "Acme has no churn risk", ds="rel_acme", kind="claim")
    r = c.post("/improve", json={"dataset": "rel_acme", "feedback": "Acme is a churn risk"})
    assert r.status_code == 200 and r.json()["stages"][0]["stage"] == "review_conflicts"


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
