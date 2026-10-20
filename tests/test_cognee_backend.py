"""CogneeBackend request shapes against a mocked Cognee REST server (no network)."""
import asyncio
import hashlib
import json

import httpx
import pytest

from keep.memory import CogneeBackend

DID = "11111111-2222-3333-4444-555555555555"


def backend(handler):
    return CogneeBackend(store=None, base_url="http://cognee.test",
                         transport=httpx.MockTransport(handler))


def test_remember_posts_multipart_and_finds_its_own_data_id():
    seen = {}
    name = "text_" + hashlib.md5(b"Acme wants SOC2", usedforsecurity=False).hexdigest()

    def handler(req):
        if req.url.path == "/api/v1/remember":
            seen["ctype"], seen["body"] = req.headers["content-type"], req.content.decode()
            return httpx.Response(200, json={"status": "completed", "items": [{"id": "other"}]})
        if req.url.path == "/api/v1/datasets":
            return httpx.Response(200, json=[{"id": "ds0", "name": "x"}, {"id": "ds1", "name": "company"}])
        assert req.url.path == "/api/v1/datasets/ds1/data"
        return httpx.Response(200, json=[{"id": "other", "name": "text_0.txt"}, {"id": DID, "name": name}])

    assert asyncio.run(backend(handler).remember("company", "Acme wants SOC2")) == DID
    assert seen["ctype"].startswith("multipart/form-data")
    for part in ('name="datasetName"\r\n\r\ncompany', 'name="raw_data"\r\n\r\nAcme wants SOC2',
                 'name="self_improvement"\r\n\r\nfalse', 'name="run_in_background"\r\n\r\nfalse'):
        assert part in seen["body"]


def test_remember_raises_when_item_not_found():
    def handler(req):
        if req.url.path == "/api/v1/datasets":
            return httpx.Response(200, json=[])
        return httpx.Response(200, json={"items": []})

    with pytest.raises(LookupError):
        asyncio.run(backend(handler).remember("company", "t"))


def test_recall_uses_chunks_and_returns_cognee_data_id():
    seen = {}

    def handler(req):
        seen["path"], seen["json"] = req.url.path, json.loads(req.content)
        return httpx.Response(200, json=[
            {"kind": "CHUNKS", "text": "SOC2 by March", "score": 0.9, "metadata": {"data_id": DID}},
            {"source": "system", "status": "memory_warming_up", "text": "Memory is still warming up"},
            {"text": ""}])

    out = asyncio.run(backend(handler).recall(["company"], "soc2", 3))
    assert seen["path"] == "/api/v1/recall"
    assert seen["json"] == {"query": "soc2", "searchType": "CHUNKS", "topK": 3}  # no dataset filter
    assert out == [{"text": "SOC2 by March", "data_id": DID, "score": 0.9}]


def test_forget_sends_data_id_and_dataset():
    seen = {}

    def handler(req):
        seen["path"], seen["json"] = req.url.path, json.loads(req.content)
        return httpx.Response(200, json={})

    asyncio.run(backend(handler).forget(DID, "company"))
    assert seen["path"] == "/api/v1/forget"
    assert seen["json"] == {"dataId": DID, "dataset": "company"}


def test_forget_without_id_makes_no_call():
    def handler(req):
        raise AssertionError("no request expected")

    asyncio.run(backend(handler).forget(None, "company"))


def test_improve_reviews_conflicts_and_maps_stages():
    seen = {}

    def handler(req):
        seen["path"], seen["json"] = req.url.path, json.loads(req.content)
        return httpx.Response(200, json={"status": "completed", "stages": [
            {"stage": "review_conflicts", "status": "completed", "counts": {"n": 1}, "duration_ms": 5}]})

    out = asyncio.run(backend(handler).improve("company", "fb"))
    assert seen["path"] == "/api/v1/improve"
    assert seen["json"] == {"datasetName": "company", "reviewConflicts": True}
    assert out == [{"stage": "review_conflicts", "status": "completed", "reason": None,
                    "counts": {"n": 1}}]


def test_http_error_raises():
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(backend(lambda r: httpx.Response(500)).recall(["c"], "q", 1))
