"""Credit gate: Flexprice wallet balance when reachable, local wallet otherwise."""
import httpx

from keep import billing
from keep.store import Store


def flexprice(balance, status=200):
    def handler(req: httpx.Request) -> httpx.Response:
        if status != 200:
            return httpx.Response(status, json={})
        if req.url.path.endswith("/customers/external/lumen"):
            return httpx.Response(200, json={"id": "cust_1"})
        if req.url.path.endswith("/customers/cust_1/wallets"):
            return httpx.Response(200, json=[{"id": "wal_1", "credit_balance": "1000",
                                              "real_time_credit_balance": balance}])
        return httpx.Response(404, json={})
    return httpx.Client(base_url="https://flexprice.test/v1", transport=httpx.MockTransport(handler))


def test_remote_balance_reads_real_time_credits():
    assert billing.remote_balance("lumen", flexprice("812.5")) == 812.5


def test_remote_balance_none_when_flexprice_fails():
    assert billing.remote_balance("lumen", flexprice("1", status=503)) is None


def test_gate_prefers_flexprice_balance(tmp_path, monkeypatch):
    monkeypatch.setenv("KEEP_CREDITS_START", "1000")
    monkeypatch.setattr(billing, "remote_balance", lambda customer, client=None: 150.0)
    g = billing.Wallet(Store(tmp_path)).gate("deep_research")
    assert g["allow"] is False and g["balance"] == 150.0 and g["source"] == "flexprice"


def test_gate_falls_back_to_local_wallet(tmp_path, monkeypatch):
    monkeypatch.setenv("KEEP_CREDITS_START", "1000")
    monkeypatch.setattr(billing, "remote_balance", lambda customer, client=None: None)
    g = billing.Wallet(Store(tmp_path)).gate("deep_research")
    assert g["allow"] is True and g["balance"] == 1000 and g["source"] == "local"
