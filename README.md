# PrismKeep

**Your agents never tell an investor something your customers contradict.**

PrismKeep is a team of six AI agents that runs a founder's follow-ups. They work together in one Band room and share one Cognee memory of every investor meeting, customer call and support ticket. Before anything goes out, a second agent checks every claim against everything any stakeholder has said, and nothing is sent until the founder approves it.

Built at the SF Startup Challenge (AWS Builder Loft, Oct 20, 2026) with **Band Desktop**, **Cognee**, **Flexprice** and **Snyk**. All companies, people and numbers in the demo are synthetic.

## The problem

Founders of seed to Series A B2B startups run the raise, sales and support themselves. They make promises in every conversation ("SSO by Friday", "the retention cohort by Friday"), and some of them slip. AI now drafts their follow-ups, so it's easy to send an investor "no churn risk in our top accounts" when last week the biggest customer said it would look at alternatives.

What exists doesn't catch this. Note-takers (Granola, Otter, Fathom) record meetings. CRMs (Attio, Affinity) store contacts. Support bots (Intercom Fin) answer tickets. Fundraise tools (Metal) approve plans. None of them checks an outbound draft against **every other conversation** before it's sent.

## How it works

```
 Prism meeting (Recall.ai bot) / support ticket / pasted transcript
        │
        ▼
 ┌────────────────────────── Band Desktop: Hq room ───────────────────────────┐
 │ Chief of Staff (Claude Code)   plans on the board, routes by @mention       │
 │ Listener (LangGraph)           extracts promises, claims, risks + quotes    │
 │ Drafter (Codex)                writes follow-ups from memory                │
 │ Brain (LangGraph)              checks every claim; forget + improve         │
 │ Founder                        Approve / Edit / Reject (band ask)           │
 └────────────────────────────────────────────────────────────────────────────┘
 ┌────────────────────────── Band Desktop: Eng room ──────────────────────────┐
 │ Fixer (Codex)                  patches the bug a customer was promised      │
 │ Security Reviewer (Claude Code + Snyk)  blocks the task until scans clean   │
 └────────────────────────────────────────────────────────────────────────────┘
        │  every agent reads and writes memory through `keep`
        ▼
 keep-api (FastAPI) ──► Cognee 1.6.5 container (Neo4j graph)   remember / recall / forget / improve
                    ──► Flexprice                              usage events, credit wallet, feature gate
                    ──► outbox + approvals ledger              sha256 of exactly what was approved
```

### The agent team

| Agent | Built with | Room | Job | Cognee |
|---|---|---|---|---|
| Chief of Staff | Claude Code (owned by Band Desktop) | Hq, Eng | Recalls first, writes the plan as board tasks, hands off by @mention, asks the founder to approve, posts the cost card, pulls meetings from Prism (MCP) | Writes decisions and approvals |
| Listener | LangGraph on the Band Python SDK | Hq | Extracts two-sided promises, claims and risks with exact quotes | Writes `rel_<counterparty>` and `company` |
| Drafter | Codex (owned by Band Desktop) | Hq | Drafts investor and customer replies, with an evidence label on every claim | Recalls open promises and risks |
| Brain | LangGraph on the Band Python SDK | Hq | Checks each claim against all memory, blocks contradictions, applies founder corrections | Recall, **forget**, **improve** |
| Fixer | Codex (owned by Band Desktop) | Eng | Fixes the customer's bug in `lumen-app` (a separate, deliberately vulnerable demo repo) | Recalls past security findings |
| Security Reviewer | Claude Code + Snyk CLI | Eng, Hq | Snyk Code on every fix; sets the task to blocked until clean; scores our repo | Writes findings with repeat counts |

### What the demo shows

1. A Prism meeting (or a pasted transcript) goes into Hq. The **Listener** stores promises, claims and risks in Cognee.
2. In rehearsal, the Listener also flagged on its own that an investor claim ("Acme will expand") conflicted with the Acme call ("security blocks rollout without SSO").
3. We **restart the Drafter** on camera. Its context is gone, yet it opens the follow-up with "As promised on Oct 13…", recalled from Cognee.
4. The **Brain blocks** "no churn risk", citing the Acme call (`[memory: rel_acme / "we will look at alternatives if SSO slips"]`).
5. The founder corrects memory ("Acme renewed this morning"). The Brain **forgets** the stale fact, **improves** the dataset, and the next draft changes.
6. The founder **approves** in Band; the outbox writes the email and records its **sha256**.
7. In Eng, the **Fixer** patches the Acme CSV leak. The **Security Reviewer** blocks the first fix (path traversal), clears the second, and stores the finding.
8. Cost per agent shows in Band Analytics and the room badge, and every task is metered into Flexprice.

## Why Band and Cognee are essential

| Remove | What breaks |
|---|---|
| **Band** | No shared board, no @mention handoffs between six agents built with three tools, no founder approvals in the room, no per-agent cost. It goes back to a founder copy-pasting between chat windows. |
| **Cognee** | The restarted Drafter can't cite last week's promise, the Brain can't see the Acme call, and founder corrections have nothing to forget or improve. The contradiction catch, which is the product, disappears. |
| Flexprice | No usage-based pricing, no credit gate on expensive actions, no pass-through of agent cost. |
| Snyk | No security gate on fixes, no repeat-finding memory, no score on our own repo. |

## Sponsor integrations

- **Band Desktop.** Two rooms (Hq, Eng); six agents built with three tools (Claude Code, Codex, LangGraph via `band-sdk`); a shared work board (To-do → Done); @mention handoffs; founder approvals through `band ask` and permission prompts; per-agent and per-room cost in Analytics.
- **Cognee.** Version 1.6.5 runs as its own container with **Neo4j** as the graph store. Agents write memory while they work (`remember`) and recall before they act (`recall`), both across a restart and across agents. Founder corrections use `forget` + `improve`. Datasets: `company`, `rel_<counterparty>`, `eng_security`. Measured: remember about 4 s, recall about 1 s.
- **Flexprice.** Meters `agent_tokens`, `agent_tasks` and `approved_outbound` for a workspace customer on a 1,000-credit prepaid wallet; the credit gate reads the live wallet balance before deep research. See `keep/billing.py` and `keep/flexprice_setup.py`.
- **Snyk.** A Security Reviewer agent in the room runs Snyk Code on every fix, blocks the work item until it's clean, and stores repeat findings in Cognee. Our own repo scores **9.8 out of 10** on the organizers' `app-security-score`. Moving Cognee into its own container cut our Python dependency tree from 213 to 61 packages, and the Cognee image is scanned separately with Snyk Container. The repo is monitored from the Snyk dashboard, and Snyk's own fix PR (filelock) was applied within minutes. Details: [docs/security.md](docs/security.md).
- **Prism (our meeting product).** The Chief of Staff pulls meetings through Prism's read-only MCP (`list_recent_meetings`, `get_meeting`). Prism records calls with its Recall.ai bot, so in production transcripts arrive automatically.

## Business

- **Buyer:** founders of 2–30 person B2B startups who run fundraising, sales and support themselves. They feel it most during a raise.
- **Pricing:** **Fundraise Sprint** $199 for 8 weeks (the entry offer) · **Founder** $99/month (100 conversations, Prism capture, approvals) · **Team** $299/month (5 seats, customer success + Snyk-gated fixes) · overage metered in Flexprice.
- **Expansion:** accelerators and VC platform teams license it for their portfolio, because investors want consistent, truthful updates.
- **Our edge:** one memory across every stakeholder, a tamper-evident record of every send, capture that already runs in Prism, and security built into the workflow.

## Run it

Prerequisites: Docker, [uv](https://docs.astral.sh/uv/), Node 20+, Band Desktop signed in. Put keys in `.env` (see `.env.example`; never commit it).

```sh
scripts/setup.sh                      # tools, Snyk CLI, uv sync, .env
scripts/start-memory.sh               # Neo4j + Cognee containers, keep-api on Cognee, round-trip test
(cd web && npm ci && npm run build)   # PrismKeep web app, served at http://127.0.0.1:8787
uv run --env-file .env python -m agents.sdk.run listener   # Band SDK agents (needs agent_config.yaml)
uv run --env-file .env python -m agents.sdk.run brain
scripts/reset-lumen-app.sh            # put the demo app back to its vulnerable state
uv run pytest -q                      # tests
scripts/security-score.sh             # organizers' Snyk scorer on this repo
```

The Claude Code and Codex agents are created in Band Desktop (Agents › New agent) with the instructions in [`agents/`](agents/). See [agents/README.md](agents/README.md).

## Repo map

| Path | What |
|---|---|
| `keep/` | Memory service (Cognee REST backend or offline), CLI, outbox with approval hash, Flexprice billing and gate |
| `agents/` | Instructions for all six agents; Band SDK runner for the Listener and Brain |
| `web/`, `ui/` | PrismKeep web app (React + Vite, exact-pinned) and a no-build fallback |
| `data/seed/` | Synthetic conversations used as demo inputs |
| `docs/security.md` | Security design and scan results |
| `plan/` | Research, PRD, demo and video scripts |

## Team

Vidyut Sriram (agents + Band) · Abhinav Dasari (memory + Cognee) · Deekshith Reddy Bhoomireddy (UI/UX) · Rishit Rai (security + billing)
