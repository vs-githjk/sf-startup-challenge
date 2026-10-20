"""Flexprice metering (best effort) and a local credit wallet."""
import logging
import os
import uuid
from datetime import datetime, timezone

import httpx

log = logging.getLogger("keep.billing")
ACTION_COST = {"conversation": 10, "outbound": 5, "security_fix": 20}
FEATURE_COST = {"deep_research": 200}


def send_event(event_name: str, customer_id: str, properties: dict) -> bool:
    """POST one usage event to Flexprice. Never raises; returns the synced flag."""
    key = os.environ.get("FLEXPRICE_API_KEY")
    if not key:
        log.info("flexprice_synced=false (no key) event=%s", event_name)
        return False
    base = os.environ.get("FLEXPRICE_BASE_URL", "https://us.api.flexprice.io/v1").rstrip("/")
    body = {"event_id": str(uuid.uuid4()), "event_name": event_name,
            "external_customer_id": customer_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "properties": {k: str(v) for k, v in properties.items()}}
    try:
        r = httpx.post(f"{base}/events", json=body, headers={"x-api-key": key}, timeout=5.0)
        r.raise_for_status()
        return True
    except Exception as exc:  # any failure must stay out of the request path
        log.warning("flexprice_synced=false event=%s err=%s", event_name, type(exc).__name__)
        return False


def remote_balance(customer_id: str, client: httpx.Client | None = None) -> float | None:
    """Real-time credit balance of the customer's Flexprice wallet, or None if unavailable."""
    if client is None:
        key = os.environ.get("FLEXPRICE_API_KEY")
        if not key:
            return None
        base = os.environ.get("FLEXPRICE_BASE_URL", "https://us.api.flexprice.io/v1").rstrip("/")
        client = httpx.Client(base_url=base, headers={"x-api-key": key}, timeout=3.0)
    try:
        with client:
            r = client.get(f"/customers/external/{customer_id}")
            r.raise_for_status()
            r = client.get(f"/customers/{r.json()['id']}/wallets")
            r.raise_for_status()
            data = r.json()
            wallets = data if isinstance(data, list) else data.get("items") or []
            if not wallets:
                return None
            # only this endpoint subtracts the current period's unbilled usage
            r = client.get(f"/wallets/{wallets[0]['id']}/balance/real-time")
            r.raise_for_status()
            return float(r.json()["real_time_credit_balance"])
    except Exception as exc:  # the gate must still answer when Flexprice is down
        log.warning("flexprice_balance=unavailable err=%s", type(exc).__name__)
        return None


def token_credits(tokens_in: int, tokens_out: int) -> float:
    """1 credit per 1000 tokens."""
    return (tokens_in + tokens_out) / 1000.0


class Wallet:
    """Local credits: KEEP_CREDITS_START minus spend, recorded as credit_spend events."""

    def __init__(self, store):
        self.store = store

    def start(self) -> float:
        return float(os.environ.get("KEEP_CREDITS_START", "1000"))

    def balance(self) -> float:
        spent = sum(float(e["payload"].get("credits", 0))
                    for e in self.store.events(0, 1_000_000, "credit_spend"))
        return round(self.start() - spent, 3)

    def spend(self, credits: float, reason: str, agent: str = "") -> float:
        self.store.event("credit_spend", agent, {"credits": credits, "reason": reason})
        return self.balance()

    def gate(self, feature: str) -> dict:
        """Flexprice wallet is the source of truth; the local wallet covers outages."""
        cost = FEATURE_COST.get(feature, ACTION_COST.get(feature))
        bal = remote_balance(os.environ.get("FLEXPRICE_CUSTOMER_ID", "lumen"))
        source = "flexprice"
        if bal is None:
            bal, source = self.balance(), "local"
        if cost is None:
            return {"feature": feature, "allow": False, "reason": "unknown feature",
                    "cost": 0, "balance": bal, "source": source}
        return {"feature": feature, "allow": bal >= cost, "cost": cost, "balance": bal,
                "source": source}
