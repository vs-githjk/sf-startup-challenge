# Demo runbook: Snyk and Flexprice beats

Run on the Band host laptop. Never show `.env`, tokens or keys on screen.

## Flexprice: credits gate a feature (repeatable)

1. Normal workspace (1,000 credits): `FLEXPRICE_CUSTOMER_ID=lumen`. Gate allows deep research.
2. Low credit workspace (50 credits), created once and safe to re-run:
   `FLEXPRICE_CUSTOMER_ID=lumen_lowcredit KEEP_CREDITS_START=50 uv run python -m keep.flexprice_setup`
3. Start keep-api with `FLEXPRICE_CUSTOMER_ID=lumen_lowcredit`. `keep gate deep_research` returns deny (cost 200, balance 50, source flexprice).
4. Show the same event stream and wallet on the Flexprice dashboard. Balances lag a few seconds, so do not demo a drop right after an event.

## Snyk: block, fix, clean rescan

1. `scripts/reset-lumen-app.sh` puts the sample app back to its vulnerable state.
2. Fixer fixes only the ticketed bug. Security Reviewer runs `../../scripts/snyk-scan.sh <lumen-app path>`, blocks on findings, stores them with `keep remember --dataset eng_security --kind finding`.
3. Fixer fixes what the scan reports, reviewer rescans, posts clean, task moves to Done.
4. End card: the organizers' scorer number from a real run (`app-security-score` on the public repo URL). Never type a number that was not produced by a run.

## What stands between us and a full 10 (bonus criteria)

| Tool | Done | Still needed (needs the Band host) |
|---|---|---|
| Snyk | Official scorer 9.8, code 0 issues, scan wrapper | Block, fix, unblock cycle in the Eng room; repeat finding recalled from Cognee; final scorer number at freeze |
| Flexprice | Meters, plan, wallet, live gate, denial from low credit customer | Cost card per agent from Band usage passed through; dashboard capture; denial on video |
