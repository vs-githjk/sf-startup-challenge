"""keep CLI: thin httpx client for keep-api. Prints JSON, exit 1 on HTTP error."""
import argparse
import json
import os
import sys
from pathlib import Path

import httpx

from .paths import confine

KINDS = ["promise", "claim", "risk", "decision", "finding", "correction"]


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="keep")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("remember")
    r.add_argument("--dataset", required=True)
    r.add_argument("--kind", required=True, choices=KINDS)
    r.add_argument("--text", required=True)
    r.add_argument("--source")
    c = sub.add_parser("recall")
    c.add_argument("--dataset", required=True, help="one or comma separated")
    c.add_argument("--query", required=True)
    c.add_argument("--top", type=int, default=5)
    f = sub.add_parser("forget")
    f.add_argument("--data-id", required=True)
    i = sub.add_parser("improve")
    i.add_argument("--dataset", required=True)
    i.add_argument("--feedback", required=True)
    k = sub.add_parser("cost")
    k.add_argument("--agent", required=True)
    k.add_argument("--harness", default="")
    k.add_argument("--room", default="")
    k.add_argument("--tokens-in", type=int, default=0)
    k.add_argument("--tokens-out", type=int, default=0)
    k.add_argument("--tasks", type=int, default=0)
    k.add_argument("--usd", type=float)
    sub.add_parser("credits")
    g = sub.add_parser("gate")
    g.add_argument("feature")
    a = sub.add_parser("approve")
    a.add_argument("--draft", required=True)
    s = sub.add_parser("send")
    s.add_argument("--draft", required=True)
    sub.add_parser("drafts")
    d = sub.add_parser("draft")
    d.add_argument("--to", required=True)
    d.add_argument("--subject", required=True)
    d.add_argument("--body-file", required=True)
    return p


def call(a: argparse.Namespace) -> httpx.Response:
    base = os.environ.get("KEEP_URL", "http://127.0.0.1:8787").rstrip("/")
    c = httpx.Client(base_url=base, timeout=120.0)
    if a.cmd == "remember":
        return c.post("/remember", json={"dataset": a.dataset, "kind": a.kind, "text": a.text,
                                         "source": a.source})
    if a.cmd == "recall":
        return c.post("/recall", json={"datasets": a.dataset.split(","), "query": a.query,
                                       "top": a.top})
    if a.cmd == "forget":
        return c.post("/forget", json={"data_id": a.data_id})
    if a.cmd == "improve":
        return c.post("/improve", json={"dataset": a.dataset, "feedback": a.feedback})
    if a.cmd == "cost":
        body = {"agent": a.agent, "harness": a.harness, "room": a.room, "tokens_in": a.tokens_in,
                "tokens_out": a.tokens_out, "tasks": a.tasks}
        if a.usd is not None:
            body["usd"] = a.usd
        return c.post("/cost", json=body)
    if a.cmd == "credits":
        return c.get("/credits")
    if a.cmd == "gate":
        return c.get(f"/gate/{a.feature}")
    if a.cmd == "approve":
        return c.post(f"/drafts/{a.draft}/approve")
    if a.cmd == "send":
        return c.post(f"/drafts/{a.draft}/send")
    if a.cmd == "drafts":
        return c.get("/drafts")
    body = confine(a.body_file).read_text(encoding="utf-8")
    return c.post("/drafts", json={"to_name": a.to, "subject": a.subject, "body": body})


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        r = call(args)
    except httpx.HTTPError as exc:
        print(json.dumps({"error": type(exc).__name__}))
        return 1
    try:
        out = r.json()
    except ValueError:
        out = {"error": r.text[:500]}
    print(json.dumps(out, indent=2))
    return 0 if r.is_success else 1


if __name__ == "__main__":
    sys.exit(main())
