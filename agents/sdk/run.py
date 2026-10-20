"""Run a PrismKeep LangGraph agent (Listener or Brain) in Band.

    uv run --env-file .env python -m agents.sdk.run listener
    uv run --env-file .env python -m agents.sdk.run brain

Needs: keep-api running (KEEP_URL), ANTHROPIC_API_KEY, and the agent's id and key in
agent_config.yaml (register at app.band.ai/agents > Connect Agent).
"""

import asyncio
import os
import sys
from pathlib import Path

import certifi
import httpx
from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool

# python.org builds on macOS ship without root certificates, so Band's WebSocket fails with
# CERTIFICATE_VERIFY_FAILED. Point Python at certifi's bundle unless the caller set one.
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

from band import Agent, Capability, Emit
from band.adapters import LangGraphAdapter
from band.adapters.langgraph import LangGraphAdapterConfig
from band.config import load_agent_config

KEEP_URL = os.getenv("KEEP_URL", "http://127.0.0.1:8787")
MODEL = os.getenv("KEEP_AGENT_MODEL", "claude-sonnet-5-5")
PROMPTS = Path(__file__).resolve().parent.parent / "prompts"
ROLES = {"listener": "listener.md", "brain": "brain.md"}


def _post(path: str, body: dict) -> dict:
    r = httpx.post(f"{KEEP_URL}{path}", json=body, timeout=120)
    r.raise_for_status()
    return r.json()


@tool
def remember(dataset: str, kind: str, text: str, source: str = "") -> dict:
    """Store one fact in company memory. kind: promise, claim, risk, decision, finding or correction.
    dataset: company, eng_security or rel_<slug> (e.g. rel_acme). Returns the data_id."""
    return _post("/remember", {"dataset": dataset, "kind": kind, "text": text, "source": source or None})


@tool
def recall(datasets: list[str], query: str, top: int = 5) -> dict:
    """Search company memory. Returns facts with dataset, data_id and score."""
    return _post("/recall", {"datasets": datasets, "query": query, "top": top})


@tool
def forget(data_id: str) -> dict:
    """Remove one stale fact from memory by its data_id (from recall)."""
    return _post("/forget", {"data_id": data_id})


@tool
def improve(dataset: str, feedback: str) -> dict:
    """Ask memory to learn from a founder correction on one dataset."""
    return _post("/improve", {"dataset": dataset, "feedback": feedback})


def build(role: str) -> Agent:
    agent_id, api_key = load_agent_config(role)
    adapter = LangGraphAdapter(
        config=LangGraphAdapterConfig(custom_section=(PROMPTS / ROLES[role]).read_text(encoding="utf-8")),
        llm=ChatAnthropic(model=MODEL, max_tokens=2048),
        additional_tools=[remember, recall, forget, improve],
        capabilities={Capability.TASKS},
        emit={Emit.USAGE},
    )
    return Agent.create(
        adapter=adapter,
        agent_id=agent_id,
        api_key=api_key,
        ws_url=os.getenv("BAND_WS_URL", "wss://app.band.ai/api/v1/socket/websocket"),
        rest_url=os.getenv("BAND_REST_URL", "https://app.band.ai"),
    )


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ROLES:
        sys.exit(f"usage: python -m agents.sdk.run {{{'|'.join(ROLES)}}}")
    asyncio.run(build(sys.argv[1]).run())
