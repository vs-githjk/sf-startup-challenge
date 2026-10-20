"""Load the synthetic seed memories into keep-api (run before recording).

    uv run python scripts/seed.py            # keep-api must be running (KEEP_URL)

These are the facts the Listener would extract from the Oct 13 conversations, written as
self-contained sentences so recall is deterministic on stage. The live conversations
(data/seed/1x_*) are pasted into Band during the demo instead.
"""

import json
import os
import sys
from pathlib import Path

import httpx

KEEP_URL = os.getenv("KEEP_URL", "http://127.0.0.1:8787")
SEED = Path(__file__).resolve().parent.parent / "data" / "seed"

FACTS = [
    ("rel_acme", "promise", "On Oct 13 Dev Patel (Lumen CTO) promised Acme Logistics that SSO would be live by Friday Oct 17.", "01_acme_call"),
    ("rel_acme", "risk", "On Oct 13 Rosa Alvarez (Acme Logistics) said Acme will look at alternatives if SSO slips; Acme renewal is Nov 1.", "01_acme_call"),
    ("rel_acme", "promise", "On Oct 13 Maya Okafor promised Rosa Alvarez a personal SSO status note on Thursday Oct 16.", "01_acme_call"),
    ("rel_acme", "claim", "On Oct 13 Rosa Alvarez said Acme Dallas usage is down about 40 percent since the CSV export bug.", "01_acme_call"),
    ("company", "risk", "Acme Logistics, our largest account (120k ARR), is a churn risk: renewal Nov 1 depends on SSO shipping.", "01_acme_call"),
    ("rel_northline", "promise", "On Oct 13 Maya Okafor promised Sarah Chen (Northline Ventures) the six-month retention cohort by Friday Oct 17.", "02_northline_meeting"),
    ("rel_northline", "claim", "On Oct 13 Maya Okafor told Sarah Chen that Acme Logistics is expected to expand to four more regions.", "02_northline_meeting"),
    ("rel_northline", "claim", "On Oct 13 Maya Okafor told Sarah Chen that net revenue retention is 112 percent across the top ten accounts.", "02_northline_meeting"),
    ("eng_security", "finding", "Sep 18: SQL injection (python/Sqli, high) in lumen-app CSV export: f-string SQL from account_id leaked other customers' rows. Seen 1 time.", "03_security_finding"),
]


def main() -> int:
    try:
        httpx.get(f"{KEEP_URL}/health", timeout=5).raise_for_status()
    except httpx.HTTPError as e:
        print(f"keep-api not reachable at {KEEP_URL}: {e}")
        return 1
    metrics = json.loads((SEED / "metrics.json").read_text())
    acme = metrics["accounts"]["acme_logistics"]
    facts = FACTS + [(
        "company", "claim",
        f"Metric (seeded, as of {metrics['as_of']}): ARR ${metrics['arr_usd']:,}, {metrics['customers']} customers, "
        f"Acme usage change last 30 days {acme['usage_change_30d_pct']} percent.",
        "metrics.json",
    )]
    for dataset, kind, text, source in facts:
        r = httpx.post(f"{KEEP_URL}/remember", json={"dataset": dataset, "kind": kind, "text": text, "source": source}, timeout=300)
        r.raise_for_status()
        print(f"{dataset:14} {kind:9} {r.json().get('data_id')}")
    print(f"seeded {len(facts)} memories")
    return 0


if __name__ == "__main__":
    sys.exit(main())
