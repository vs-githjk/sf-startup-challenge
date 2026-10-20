import json

import httpx

from keep import flexprice_setup


class FakeFlexprice:
    """Just enough of the Flexprice API to check what setup creates."""

    def __init__(self):
        self.customers = {}
        self.features = []
        self.wallets = []
        self.plans = []
        self.prices = []
        self.subs = []
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
            for f in self.features:
                f.setdefault("meter_id", f"meter_{f['lookup_key']}")
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
        if req.method == "POST" and path == "/plans/search":
            hits = [p for p in self.plans if p["lookup_key"] == body.get("lookup_key")]
            return httpx.Response(200, json={"items": hits})
        if req.method == "POST" and path == "/plans":
            p = {"id": f"plan_{len(self.plans)}", **body}
            self.plans.append(p)
            return httpx.Response(201, json=p)
        if req.method == "POST" and path == "/prices/search":
            hits = [p for p in self.prices if p["entity_id"] in body.get("entity_ids", [])]
            return httpx.Response(200, json={"items": hits})
        if req.method == "POST" and path == "/prices":
            p = {"id": f"price_{len(self.prices)}", **body}
            self.prices.append(p)
            return httpx.Response(201, json=p)
        if req.method == "POST" and path == "/subscriptions/search":
            hits = [s for s in self.subs if s["customer_id"] == body.get("customer_id")]
            return httpx.Response(200, json={"items": hits})
        if req.method == "POST" and path == "/subscriptions":
            s = {"id": "sub_1", **body}
            self.subs.append(s)
            return httpx.Response(201, json=s)
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


def test_setup_prices_usage_like_the_local_wallet_and_subscribes():
    fake = FakeFlexprice()
    out = flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    prices = {p["meter_id"]: p for p in fake.prices}
    assert prices["meter_agent_tokens"]["amount"] == "0.001"  # 1 credit per 1000 tokens
    assert prices["meter_approved_outbound"]["amount"] == "5"
    assert all(p["type"] == "USAGE" and p["entity_id"] == "plan_0" for p in fake.prices)
    assert all(p["billing_period_count"] == 1 for p in fake.prices)
    assert fake.subs[0]["plan_id"] == "plan_0" and fake.subs[0]["customer_id"] == "cust_1"
    assert out["subscription_id"] == "sub_1"


def test_setup_adds_missing_prices_to_an_existing_plan():
    fake = FakeFlexprice()
    fake.plans.append({"id": "plan_0", "lookup_key": flexprice_setup.PLAN_KEY})
    flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    assert len(fake.plans) == 1 and len(fake.prices) == 2


def test_setup_is_idempotent():
    fake = FakeFlexprice()
    flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    first = len(fake.posts)
    flexprice_setup.setup(client_for(fake), customer="lumen", credits=1000)
    searches = [p for p, _ in fake.posts[first:] if not p.endswith("/search")]
    assert searches == []
    assert len(fake.features) == 3 and len(fake.wallets) == 1
    assert len(fake.plans) == 1 and len(fake.subs) == 1 and len(fake.prices) == 2
