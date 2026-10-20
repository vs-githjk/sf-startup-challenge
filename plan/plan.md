# PrismKeep Plan

Mode: hackathon
Brief: plan/ideas.md (critique, variants, pick)
PRD: plan/PRD.md
Base branch: main
Build branch: build/<lane> (lane-a-band, lane-b-memory, lane-c-trust), merged into main only at integration checkpoints by Person A
Test command: `uv run pytest -q` (memory and agents); `uv run python scripts/smoke.py` (end to end against seeded data)
Run command: `docker compose up -d neo4j`, `uv run python -m keep.api` (owns Cognee in-process), `uv run python -m agents.run_sdk_agents`, plus Band Desktop with the owned Claude Code and Codex agents
Progress: plan/progress.md
Hackathon only: plan/submission.md, plan/hour-plan.md (run of show), plan/demo-script.md

## Goal
A founder posts a customer ticket, a customer call or an investor meeting into a Band room, and a mixed-harness agent squad turns it into kept promises and truthful, founder-approved follow-ups, using one Cognee company brain that changes what the agents do.

## Architecture
```
                         Band HQ room (board, plan, approvals, cost card)        Band Eng room
   founder  ---------->  Chief of Staff  (Claude Code, attached /jam as architect)  Fixer (Codex)
                          | @mentions                                              Security Reviewer
           Listener (LangGraph, Band Python SDK)   Drafter (Codex)   Brain (LangGraph)  (Claude Code + Snyk CLI)
                          \___________________ all memory through ___________________/
                                         keep CLI  ->  keep-api (FastAPI, one process)
                                                         |-> Cognee 1.6.5 in-process (remember / recall / improve / forget)
                                                         |      graph: Neo4j 5 (docker), vector: LanceDB
                                                         |-> Flexprice (usage events, wallet credits, credit gate)
                                                         |-> outbox (test inbox or .eml) + approvals ledger (sha256)
```
- Band Desktop and agent API: Experimental (Chat Tasks endpoints are marked beta, VERIFIED docs.band.ai). Band Python SDK with LangGraphAdapter: Experimental (VERIFIED docs.band.ai/integrations/sdks/tutorials/langgraph).
- Cognee 1.6.5 (pinned in the repo's pyproject.toml, PyPI latest per plan/research.md): Emerging. V2 async API `remember(text, dataset_name=)`, `recall(query, datasets=)`, `improve(dataset=, ...)`, `forget(data_id=)` VERIFIED by master-finder from v1.6.5 source; memify is deprecated, say "improve". `node_set` on add scopes by stakeholder. Neo4j via `cognee.config.set_graph_db_config({...})` VERIFIED docs.cognee.ai/python-api/config.
- LangGraph: Proven. Neo4j: Proven. FastAPI: Proven. Flexprice: Emerging. Cloud API `https://us.api.flexprice.io/v1`, header `x-api-key`, `POST /events` (event_name, external_customer_id, event_id, timestamp, properties), async ingestion so balances lag (VERIFIED by master-finder). Get a key at the sponsor table; self-host is heavy (Postgres, ClickHouse, Kafka, Temporal). Snyk CLI: Proven.
- Mocked and labelled: the outbox (no real email to third parties), seeded metrics (`data/metrics.json`), all transcripts synthetic.

### Why one memory service
Cognee's default local stores are file based. Five agents in different processes writing to them invites lock errors mid demo. One process (keep-api) owns Cognee; every harness calls it through the `keep` CLI (Claude Code and Codex call it as a shell command; LangGraph agents import the same client). keep-api also logs every memory event, which the cost card and the ledger page read. It is a log, not a second store.

### Security and dependency plan (organizer scorer weighs this heavily)
Scorer: github.com/javiergarza-snyk/app-security-score (v1.5.0, sponsor-run, 2 stars, no LICENSE file, README and package.json read, `cli.mjs` NOT read yet). It runs `snyk test --all-projects` and `snyk code test` in throwaway Docker containers; score = 10 minus (critical x3 + high x1 + medium x0.3 + low x0.1), and more than 10 findings above low scores 0 (as relayed by the coordinator; formula not yet read in cli.mjs).
1. Zero npm in our repo. One Python project, `uv` with `uv.lock` committed, every dependency pinned exactly. Target direct deps: fastapi, uvicorn, httpx, pydantic, the Band SDK, langgraph, anthropic. Flexprice through httpx REST unless the SDK is tiny.
2. Keep `cognee==1.6.5` in our own lockfile (already pinned). master-finder resolved it to 173 packages with exactly one OSV advisory (diskcache 5.6.3, MODERATE, no fixed version), about 0.3 points if Snyk rates it Medium. Hiding Cognee in a container would not be honest and the scorer scans every manifest anyway. Add only the `neo4j` extra; no other Cognee extras. Neo4j runs as a pinned Docker image (not a manifest). Explain the diskcache finding in `docs/security.md`.
3. Scan cadence: H0:45 baseline, before every integration checkpoint, after freeze. Run both raw `snyk test --all-projects` and `snyk code test` locally (fast) and the scorer `node cli.mjs <local path>` at checkpoints. Record each score in `plan/progress.md`.
4. Code rules that snyk code flags: parameterised SQL only, no `subprocess` with `shell=True`, no `eval`, paths resolved under a fixed root, no secrets in code, HTTPS only, no debug mode in uvicorn.
5. The deliberately vulnerable sample customer app (`lumen-app`, used in the Fixer demo) lives in a SEPARATE repo or folder outside the submission repo, so it never counts against our score.

## Global Constraints
- Python 3.12, uv, exact pins, `uv.lock` committed. No npm.
- Cognee runs in exactly one process (keep-api); no agent imports cognee directly (concurrency, Cognee issue #5254 per research.md).
- Models: Claude via the `anthropic` SDK for LangGraph agents (Claude Code and Codex use their own logins). Check the claude-api skill for current model IDs before coding; do not hard-code from memory.
- Copy: no em dashes or en dashes; never call PrismAI a startup (PrismKeep is the hackathon product name).
- All data synthetic: company "Lumen Analytics", customer "Acme Logistics", investor "Sarah Chen, Northline Ventures" (fictional names; confirm no real collision before the video).
- Every Band message from an agent that cites memory includes `[memory: <dataset> / <short quote>]` so judges see recall happen.

## Off-limits
`.env` files, `~/.prism-secrets`, the PrismAI production services and databases, the Agentic-Meeting-Copilot repo (copy prompts out, never edit it), real email recipients, any install or signup without Vidyut's approval of that exact item.

## Interfaces
- `keep remember --dataset <ds> --kind promise|claim|risk|decision|finding|correction --text "<sentence>" [--source <conv_id>]` returns `{data_id}`; keep-api stores `data_id -> (dataset, kind, text)` so forget can target it.
- `keep recall --dataset <ds>[,<ds>] --query "<q>" [--top 5]` returns `[{text, dataset, data_id, score}]`.
- `keep forget --data-id <id>` and `keep improve --dataset <ds> --feedback "<text>"`.
- `keep cost --agent <name> --harness <h> --room <r> --tokens-in N --tokens-out N | --tasks 1` meters to Flexprice and the local log.
- `keep credits` returns wallet balance; `keep gate deep_research` returns allow or deny.
- Human approval: Chief of Staff runs `band ask --prompt "Send this to Sarah Chen?" --option Approve --option Edit --option Reject --json` (VERIFIED in `band ask --help` by master-finder; it waits for the founder's answer in the room). On Approve, `keep approve --draft <id>` stores sha256 of the exact text; `keep send --draft <id>` refuses unless the hash matches. Fallback: post `APPROVAL NEEDED <token>` and wait for `/approve <token>`.
- Cost: `band usage` gives tokens and estimated USD per coding agent (Claude Code, Codex) on this machine; SDK agents emit `Emit.USAGE` token events, priced by keep-api. Both feed the cost card and Flexprice.
- Datasets: `company` (customers, metrics, risks, promises, decisions), `rel_<slug>` per counterparty (`rel_acme`, `rel_northline`), `eng_security` (findings with counts).
- Board conventions: task titles prefixed `[CS]`, `[IR]`, `[KB]`, `[SEC]`. Band statuses are pending, in_progress, blocked, in_review, failed, completed (say To-do for pending and Done for completed). Security Reviewer sets blocked with the finding id; only it may unblock. SDK agents use `Capability.TASKS` tools; if the board is gated on our account, everyone uses the CLI `band work assign / take / board`.

## Claims we will make
- C1 | planned | Six agents on three harnesses (Claude Code, Codex, LangGraph) work in one Band room with a shared board | proof: T2, T3, T5 and the video
- C2 | planned | Agents hand off by @mention with context, no human copy-paste | proof: Band room transcript in video
- C3 | planned | Nothing is sent without the founder's approval in Band, and the sent text matches the approved hash | proof: tests/test_outbox.py (T6)
- C4 | planned | After a restart, the Drafter recalls a promise from the previous investor meeting and acts on it | proof: scripts/restart_demo.sh + video (T7)
- C5 | planned | A fact from a customer call blocks a claim in an investor email, across two different agents | proof: tests/test_truth_check.py (T5)
- C6 | planned | The founder can correct memory in Band; the agent forgets the stale fact and the next draft changes | proof: tests/test_forget_improve.py (T5)
- C7 | planned | The Security Reviewer runs Snyk, blocks the work item, and stores recurring findings in Cognee | proof: T9 + video
- C8 | planned | Our repo scores <N>/10 on the organizers' app-security-score | proof: reports/<repo>.json at freeze (fill N from the real run, never guess)
- C9 | planned | Every agent's usage is metered into Flexprice and credits gate deep research | proof: T8 + Flexprice dashboard screenshot
- C10 | planned | Memory lives in a Neo4j graph we can show | proof: Neo4j browser capture (T4)
- C11 | mocked | Outbound email (goes to a team test inbox or .eml) and company metrics (seeded file) | proof: README disclosure

## Review Focus
1. Recall returns the right fact for the scripted query AND a nearby paraphrase (judges may ask live). Expected: same top hit.
2. Two agents call keep at the same time. Expected: no lock error (single keep-api process).
3. Founder replies "approve" to the wrong draft id. Expected: refuse and say which draft is pending.
4. Flexprice or Snyk API down during demo. Expected: cost card still posts from the local log, labelled "Flexprice sync pending"; Snyk reviewer posts the last cached scan with its timestamp.
5. Band agent offline. Expected: CoS notices no claim within 60 s and posts which agent is down.

## Tasks
Demo path first. Lanes: A = Band spine and agents (Vidyut), B = memory and data, C = trust, billing and video.

### T1: Repo, pins and baseline scan (C, 30 min)
depends_on: []
files: pyproject.toml, uv.lock, docker-compose.yml (neo4j:5 pinned), .gitignore, README.md skeleton, docs/security.md
steps: repo already exists (commit b1cac52, cognee==1.6.5 pinned); add remaining pins with exact versions; neo4j container up; run snyk test --all-projects and snyk code test; read scorer cli.mjs, then run it on the local path; record baseline.
done when: score recorded in progress.md; compose healthy.
approved installs: needs Vidyut approval for uv packages list, Docker images, Snyk CLI and account, Node for the scorer.

### T2: Band spine (A, 45 min)
depends_on: []
files: agents/cos/CLAUDE.md (Chief of Staff instructions), agents/drafter/AGENTS.md, agents/fixer/AGENTS.md, docs/band-setup.md
steps: install Band Desktop; HQ and Eng rooms; attach Claude Code with `/jam as architect`; add owned Codex agents (Drafter, Fixer) and owned Claude Code (Security Reviewer); test one @mention round trip and one board task create to Done; check what the usage view shows per agent.
done when: screenshot of board with one task Done by a Codex agent after a CoS @mention.

### T3: keep-api and keep CLI over Cognee (B, 60 min)
depends_on: [T1]
files: keep/api.py, keep/client.py, keep/cli.py, tests/test_keep.py
failing test first: remember then recall through keep-api from a second process returns the fact; forget removes it from recall.
steps: time one remember + recall; wrap the V2 API in keep-api; Neo4j via set_graph_db_config; data_id map; event log.
done when: tests pass; `keep recall` works from a Codex shell.

### T4: Seed data and Neo4j view (B, 30 min)
depends_on: [T3]
files: data/seed/*.md (Acme call Oct 13, Northline meeting 1 Oct 13, prior security finding), data/metrics.json, scripts/seed.py
done when: `scripts/seed.py` loads all; Neo4j browser shows Acme, Northline, promises.

### T5: Listener and Brain LangGraph agents (B, 75 min)
depends_on: [T3]
files: agents/sdk/listener.py, agents/sdk/brain.py, agents/sdk/run_sdk_agents.py, tests/test_truth_check.py, tests/test_forget_improve.py
steps: port the Prism commitments prompt (two-sided commitments, quote verification) from ~/Agentic-Meeting-Copilot/backend/agents/commitments.py, simplified; Listener writes promises, claims, risks; Brain checks each draft claim against `company` + `rel_*` with evidence tiers (BetterBill pattern) and answers Q&A with the owner; Brain handles "forget" and "correct" founder commands.
done when: both tests pass on seeded data; both agents answer @mentions in HQ.

### T6: Approval and outbox (A, 40 min)
depends_on: [T2, T3]
files: keep/outbox.py, tests/test_outbox.py
done when: send refuses without matching hash; founder approval in Band flows through CoS.

### T7: Restart moment (A, 30 min)
depends_on: [T5, T6]
files: scripts/restart_demo.sh, docs/demo-runbook.md
done when: kill Drafter session and keep-api, restart, new transcript, Drafter cites the Oct 13 promise from memory.

### T8: Flexprice metering, credits gate, cost card (C, 75 min)
depends_on: [T3]
files: keep/billing.py, tests/test_billing.py
steps: one customer (Lumen workspace), metered features agent_tokens, agent_tasks, outbound_actions; wallet with 1,000 credits; gate for deep_research; CoS posts a cost card per room.
done when: events visible in Flexprice; gate denies when credits are low (seed a low-balance customer for the demo).

### T9: Security Reviewer with Snyk (C, 60 min)
depends_on: [T2, T3]
files: agents/security/CLAUDE.md, scripts/snyk_review.py, ../lumen-app (separate repo, deliberately vulnerable CSV export)
steps: reviewer runs snyk code test on lumen-app when a `[CS]` fix task moves to review; posts findings; blocks; `keep remember --dataset eng_security --kind finding` with a count; unblocks on a clean rescan; Fixer recalls eng_security before coding.
done when: one block, fix, unblock cycle seen in the Eng room.

### T10: Integration and smoke (A, 30 min, at each checkpoint)
depends_on: [T2..T9 as available]
files: scripts/smoke.py
done when: smoke runs the full seeded flow headless and prints PASS per beat.

### T11: README, Devpost text, video (C with Vidyut voice, from 14:45)
depends_on: [T10]
files: README.md, docs/architecture.png, plan/submission.md
done when: submitted.
