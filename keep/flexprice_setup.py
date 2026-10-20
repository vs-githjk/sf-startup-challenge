"""One-time Flexprice setup: the workspace customer, three metered features, a prepaid wallet.

Safe to re-run: anything that already exists is reused, never duplicated.
    uv run python -m keep.flexprice_setup        (needs FLEXPRICE_API_KEY in the environment)
"""
import json
import os
import sys

import httpx

# lookup_key -> (display name, meter aggregation). Event names match keep/api.py.
METERS = {
    "agent_tokens": ("Agent tokens", {"type": "SUM", "field": "tokens"}),
    "agent_tasks": ("Agent tasks", {"type": "SUM", "field": "tasks"}),
    "approved_outbound": ("Approved outbound messages", {"type": "COUNT"}),
}
PLAN_KEY = "prismkeep_workspace"
# Credits per unit, matching keep/billing.py (wallet conversion_rate 1: one credit = $1 unit).
PRICES = {"agent_tokens": "0.001", "approved_outbound": "5"}


def _items(data) -> list:
    return data if isinstance(data, list) else data.get("items") or []


def ensure_customer(c: httpx.Client, external_id: str) -> dict:
    r = c.get(f"/customers/external/{external_id}")
    if r.status_code == 200:
        return r.json()
    r = c.post("/customers", json={"external_id": external_id,
                                   "name": "Lumen Analytics (synthetic demo workspace)"})
    r.raise_for_status()
    return r.json()


def ensure_features(c: httpx.Client) -> dict:
    r = c.get("/features", params={"limit": 100})
    r.raise_for_status()
    have = {f.get("lookup_key"): f for f in _items(r.json())}
    out = {}
    for key, (name, aggregation) in METERS.items():
        if key not in have:
            r = c.post("/features", json={
                "name": name, "lookup_key": key, "type": "metered",
                "meter": {"name": name, "event_name": key, "aggregation": aggregation,
                          "reset_usage": "BILLING_PERIOD"}})
            r.raise_for_status()
            have[key] = r.json()
        out[key] = have[key]["id"]
    return out


def ensure_wallet(c: httpx.Client, customer_id: str, credits: int) -> dict:
    r = c.get(f"/customers/{customer_id}/wallets")
    r.raise_for_status()
    wallets = _items(r.json())
    if wallets:
        return wallets[0]
    r = c.post("/wallets", json={"customer_id": customer_id, "currency": "usd",
                                 "wallet_type": "PRE_PAID", "conversion_rate": "1",
                                 "initial_credits_to_load": str(credits),
                                 "description": "PrismKeep workspace credits"})
    r.raise_for_status()
    return r.json()


def ensure_plan(c: httpx.Client) -> str:
    r = c.post("/plans/search", json={"lookup_key": PLAN_KEY})
    r.raise_for_status()
    hits = [p for p in _items(r.json()) if p.get("lookup_key") == PLAN_KEY]
    if hits:
        plan_id = hits[0]["id"]
    else:
        r = c.post("/plans", json={"name": "PrismKeep Workspace", "lookup_key": PLAN_KEY,
                                   "description": "$99/mo with 1,000 credits; usage draws down credits"})
        r.raise_for_status()
        plan_id = r.json()["id"]
    ensure_prices(c, plan_id)
    return plan_id


def ensure_prices(c: httpx.Client, plan_id: str) -> None:
    r = c.post("/prices/search", json={"entity_type": "PLAN", "entity_ids": [plan_id]})
    r.raise_for_status()
    priced = {p.get("meter_id") for p in _items(r.json()) if p.get("entity_id") == plan_id}
    r = c.get("/features", params={"limit": 100})
    r.raise_for_status()
    meter_ids = {f.get("lookup_key"): f.get("meter_id") for f in _items(r.json())}
    for key, amount in PRICES.items():
        if meter_ids[key] in priced:
            continue
        r = c.post("/prices", json={
            "entity_type": "PLAN", "entity_id": plan_id, "type": "USAGE",
            "billing_model": "FLAT_FEE", "amount": amount, "meter_id": meter_ids[key],
            "currency": "usd", "price_unit_type": "FIAT", "billing_period": "MONTHLY",
            "billing_period_count": 1, "invoice_cadence": "ARREAR",
            "display_name": METERS[key][0]})
        r.raise_for_status()


def ensure_subscription(c: httpx.Client, customer_id: str, plan_id: str) -> str:
    r = c.post("/subscriptions/search", json={"customer_id": customer_id})
    r.raise_for_status()
    hits = [s for s in _items(r.json()) if s.get("plan_id") == plan_id]
    if hits:
        return hits[0]["id"]
    r = c.post("/subscriptions", json={"customer_id": customer_id, "plan_id": plan_id,
                                       "currency": "usd", "billing_period": "MONTHLY"})
    r.raise_for_status()
    return r.json()["id"]


def setup(c: httpx.Client, customer: str, credits: int) -> dict:
    cust = ensure_customer(c, customer)
    features = ensure_features(c)
    wallet = ensure_wallet(c, cust["id"], credits)
    plan_id = ensure_plan(c)
    sub_id = ensure_subscription(c, cust["id"], plan_id)
    return {"customer_id": cust["id"], "features": features, "wallet_id": wallet["id"],
            "plan_id": plan_id, "subscription_id": sub_id}


def main() -> int:
    key = os.environ.get("FLEXPRICE_API_KEY")
    if not key:
        print("FLEXPRICE_API_KEY not set", file=sys.stderr)
        return 1
    base = os.environ.get("FLEXPRICE_BASE_URL", "https://us.api.flexprice.io/v1").rstrip("/")
    customer = os.environ.get("FLEXPRICE_CUSTOMER_ID", "lumen")
    credits = int(os.environ.get("KEEP_CREDITS_START", "1000"))
    with httpx.Client(base_url=base, headers={"x-api-key": key}, timeout=15.0) as c:
        try:
            out = setup(c, customer, credits)
        except httpx.HTTPStatusError as exc:
            print(json.dumps({"error": exc.response.status_code,
                              "path": exc.request.url.path,
                              "detail": exc.response.text[:500]}))
            return 1
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
