# Seed data (all synthetic)

Every company, person and number here is invented for the demo. Lumen Analytics is our startup;
Acme Logistics is a customer; Sarah Chen at Northline Ventures is an investor.

| File | Loaded | Used in demo beat |
|---|---|---|
| `01_acme_call_2026-10-13.md` | before recording (seed) | Chief of Staff recalls Acme; Brain blocks "no churn" |
| `02_northline_meeting_2026-10-13.md` | before recording (seed) | restarted Drafter cites the Oct 13 promise |
| `03_security_finding_2026-09.md` | before recording (seed) | Fixer recalls the past finding; reviewer marks it a repeat |
| `metrics.json` | before recording (seed) | Brain labels metric claims "Metric (seeded)" |
| `10_acme_ticket_2026-10-20.md` | LIVE: founder pastes it in HQ | opens the demo |
| `11_northline_meeting_2026-10-20.md` | LIVE: founder pastes it in HQ | investor follow-up flow |
| `12_founder_correction.txt` | LIVE: founder types it | forget + improve |

Load the seed set: `uv run python scripts/seed.py` (keep-api must be running).
