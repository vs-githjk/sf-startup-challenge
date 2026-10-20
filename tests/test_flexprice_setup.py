import json

import httpx

from keep import flexprice_setup


class FakeFlexprice:
    """Just enough of the Flexprice API to check what setup creates."""

    def __init__(self):
        self.customers = {}
        self.features = []
        self.wallets = []
        self.posts = []

    def handler(self, req: httpx.Request) -> httpx.Response:
        path = req.url.path.removeprefix("/v1")
        body = json.loads(req.content) if req.content else None
        if req.method == "POST":
            self.posts.append((path, body))
        if req.method == "GET" and path.startswith("/customers/external/"):
            c = self.customers.get(path.rsplit("/", 1)[1])
            return httpx.Response(200, json=c) if c else httpx.Response(404, json={})
        if req.method == "POST" and path == "/customers":
            c = {"id": "cust_1", **body}
            self.customers[body["external_id"]] = c
            return httpx.Response(201, json=c)
        if req.method == "GET" and path == "/features":
            return httpx.Response(200, json={"items": self.features})
        if req.method == "POST" and path == "/features":
            f = {"id": f"feat_{len(self.features)}", **body}
            self.features.append(f)
            return httpx.Response(201, json=f)
        if req.method == "GET" and path == "/customers/cust_1/wallets":
            return httpx.Response(200, json=self.wallets)
        if req.method == "POST" and path == "/wallets":
            w = {"id": "wal_1", **body}
            self.wallets.append(w)
            return httpx.Response(201, json=w)
        return httpx.Response(500, json={"unexpected": f"{req.method} {path}"})


def client_for(fake):
    return httpx.Client(base_url="https://flexprice.test/v1",
                        transport=httpx.MockTransport(fake.handler))


def test_setup_creates_customer_meters_and_wallet():
    fake = FakeFlexprice()
    out = flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    assert out["customer_id"] == "cust_1"
    meters = {f["lookup_key"]: f["meter"] for f in fake.features}
    assert set(meters) == {"agent_tokens", "agent_tasks", "approved_outbound"}
    assert meters["agent_tokens"]["event_name"] == "agent_tokens"
    assert meters["agent_tokens"]["aggregation"] == {"type": "SUM", "field": "tokens"}
    assert meters["agent_tasks"]["aggregation"] == {"type": "SUM", "field": "tasks"}
    assert meters["approved_outbound"]["aggregation"] == {"type": "COUNT"}
    assert all(f["type"] == "metered" for f in fake.features)
    assert fake.wallets[0]["initial_credits_to_load"] == "1000"
    assert fake.wallets[0]["wallet_type"] == "PRE_PAID"


def test_setup_is_idempotent():
    fake = FakeFlexprice()
    flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    first = len(fake.posts)
    flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    assert len(fake.posts) == first
    assert len(fake.features) == 3 and len(fake.wallets) == 1
