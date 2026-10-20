"""CogneeBackend request shapes against a mocked Cognee REST server (no network)."""
import asyncio
import json

import httpx
import pytest

from keep.memory import CogneeBackend

DID = "11111111-2222-3333-4444-555555555555"


def backend(handler):
    return CogneeBackend(store=None, base_url="http://cognee.test",
                         transport=httpx.MockTransport(handler))


def test_remember_posts_multipart_and_returns_data_id():
    seen = {}

    def handler(req):
        seen["path"], seen["ctype"] = req.url.path, req.headers["content-type"]
        seen["body"] = req.content.decode()
        return httpx.Response(200, json={"status": "completed", "items": [{"id": DID}]})

    assert asyncio.run(backend(handler).remember("company", "Acme wants SOC2")) == DID
    assert seen["path"] == "/api/v1/remember" and seen["ctype"].startswith("multipart/form-data")
    for part in ('name="datasetName"\r\n\r\ncompany', 'name="raw_data"\r\n\r\nAcme wants SOC2',
                 'name="self_improvement"\r\n\r\nfalse'):
        assert part in seen["body"]


def test_remember_falls_back_to_newest_dataset_item():
    def handler(req):
        if req.url.path == "/api/v1/remember":
            return httpx.Response(200, json={"status": "completed", "items": [{"name": "x"}]})
        if req.url.path == "/api/v1/datasets":
            return httpx.Response(200, json=[{"id": "ds1", "name": "company"}])
        assert req.url.path == "/api/v1/datasets/ds1/data"
        return httpx.Response(200, json=[{"id": "old", "createdAt": "2026-01-01"},
                                         {"id": DID, "createdAt": "2026-02-01"}])

    assert asyncio.run(backend(handler).remember("company", "t")) == DID


def test_recall_request_and_parsing():
    seen = {}

    def handler(req):
        seen["path"], seen["json"] = req.url.path, json.loads(req.content)
        return httpx.Response(200, json=[{"source": "graph", "text": "SOC2 by March", "score": 0.9,
                                          "dataset_name": "company"}, {"text": ""}])

    out = asyncio.run(backend(handler).recall(["company"], "soc2", 3))
    assert seen["path"] == "/api/v1/recall"
    assert seen["json"] == {"query": "soc2", "datasets": ["company"], "topK": 3}
    assert out == [{"text": "SOC2 by March", "dataset": "company", "data_id": None,
                    "score": 0.9, "kind": None}]


def test_forget_sends_data_id_and_dataset():
    seen = {}

    def handler(req):
        seen["path"], seen["json"] = req.url.path, json.loads(req.content)
        return httpx.Response(200, json={})

    asyncio.run(backend(handler).forget(DID, "company"))
    assert seen["path"] == "/api/v1/forget"
    assert seen["json"] == {"dataId": DID, "dataset": "company"}


def test_forget_without_ids_makes_no_call():
    def handler(req):
        raise AssertionError("no request expected")

    asyncio.run(backend(handler).forget(None, "company"))
    asyncio.run(backend(handler).forget(DID, None))


def test_improve_request():
    seen = {}

    def handler(req):
        seen["path"], seen["json"] = req.url.path, json.loads(req.content)
        return httpx.Response(200, json={"status": "completed"})

    asyncio.run(backend(handler).improve("company", "fb"))
    assert seen["path"] == "/api/v1/improve" and seen["json"] == {"datasetName": "company"}


def test_http_error_raises():
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(backend(lambda r: httpx.Response(500)).recall(["c"], "q", 1))
