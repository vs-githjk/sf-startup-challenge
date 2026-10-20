# PrismKeep hour plan (run of show)

Assumed window: H0 = 11:00, D (submission deadline) = 16:00 PDT. Not confirmed; if D differs, shift every clock time by the same amount. The 5-hour sprint scales the playbook anchors: storyboard gate H2:00, feature freeze D-1:30, submitted D-0:30.

## Lanes (split by layer of one product, not by track)
- **Person A (Vidyut): Band spine and agents.** Owns the spine: Band Desktop host laptop, HQ and Eng rooms, board conventions, all agent instructions (Chief of Staff, Drafter, Fixer prompts), approval flow and outbox, merges at every checkpoint, demo driver and voice.
- **Person B: Memory and data.** Owns the memory contract (`keep` CLI and keep-api interface in plan.md), Cognee plus Neo4j, seed data, the two LangGraph agents (Listener, Brain) and forget/improve.
- **Person C: Trust, billing and proof.** Owns security (pins, Snyk scans, scorer runs, Security Reviewer agent, sample `lumen-app` repo), Flexprice metering and gate, cost card, README, video capture and edit.

Spine rule: A merges; B owns the keep interface and changes it only by posting the diff in the team chat first; C can block any merge that lowers the security score.

## Timeline
| Clock | A (Band spine) | B (memory) | C (trust, billing, video) | Checkpoint / gate | Only Vidyut decides |
|---|---|---|---|---|---|
| 11:00 to 11:15 | Read plan, lock name and story with team (5 min). Approve installs and signups. | Same | Same | Idea lock | idea, name, every install and signup listed below |
| 11:15 to 11:45 | Install Band Desktop, `band init`, `band preflight`, HQ + Eng rooms, attach Claude Code `/jam as architect`, add owned Codex and Claude Code agents. One @mention round trip, one task pending to completed, one `band ask`, one `band usage`. Test whether the task board is gated on the account. | `uv sync`, Neo4j container up, keep-api skeleton owning Cognee 1.6.5; time one remember + recall + forget on Neo4j. | Pins, Snyk CLI auth (PAT as SNYK_TOKEN), read scorer `cli.mjs`, baseline `snyk test --all-projects`, `snyk code test` and scorer run. Flexprice key from the sponsor table, send one event, read usage back. | **11:45 Band gate**: if no agent has replied in a room, switch to Band fallback (below) | Band fallback switch |
| 11:45 to 12:30 | Chief of Staff instructions (plan, board, routing, memory citations); Drafter and Fixer AGENTS.md; board conventions | keep-api + keep CLI + data_id map + event log; tests | Flexprice: customer, metered features, wallet, event ingest from `keep cost`; sample `lumen-app` repo (separate) with the CSV export bug | | |
| **12:30 CP1** | A merges. Codex Drafter runs `keep recall` from its shell and quotes a seeded fact in Band. | | Snyk scan before merge, score recorded | **CP1**: harness agent reads Cognee through keep; score >= baseline | |
| 12:30 to 13:30 | Approval and outbox with hash; CoS approval message format; cost card post | Seed data (3 conversations, metrics), Listener agent (port Prism commitments prompt), Brain truth check with evidence tiers | Security Reviewer agent: scan lumen-app, post, block, store finding in `eng_security`, unblock; Fixer recalls findings | 13:00 storyboard gate: Vidyut approves demo-script.md beats (10 min, C drafts stills from Band screenshots) | storyboard "approve" |
| **13:30 CP2** | Full happy path once, ugly is fine: ticket, fix, block, unblock; investor transcript, draft, block | | Scan, score recorded | **CP2**: every beat of demo-script reaches Band at least once | which beats to cut |
| 13:30 to 14:15 | Restart moment script; rehearse handoff timings; fix routing bugs | Brain forget/improve on founder correction; Neo4j browser styling; paraphrase recall check | Credit gate on deep research; cost card numbers; README draft with architecture and security section | | |
| **14:15 first recording** | Drive one full run while C screen-records (safety copy) | Watch memory events, fix | Record | Safety video exists | |
| **14:30 FEATURE FREEZE** | Bug fixes only from here | Bug fixes only | Final scan and scorer run; record score in progress.md and claims C8 | **Freeze** | any post-freeze change |
| 14:30 to 15:15 | Clean recording runs (2 takes), voiceover | Write Devpost project description: Cognee section; fill claims ledger states | Edit video to 3:00 max, captions, check every frame for secrets | | final take |
| 15:15 to 15:30 | Review video and Devpost text | Review repo README links | Upload video (unlisted if allowed), fill submission fields | | upload, submit |
| **15:30 SUBMITTED** | Press submit, confirm | | Incognito check: video plays, repo public, fields filled | **Submitted D-0:30** | submit |
| 15:30 to 16:00 | Buffer. Pitch drill (2 min + Q&A) | Buffer | Buffer | | |

## Cut line (drop in this order if behind at CP2)
1. Brain Q&A beat (keep truth check).
2. Credit gate (keep metering events and cost card).
3. Fixer patching live (show a pre-run Eng room segment; Security Reviewer block stays live).
4. improve (keep forget; it carries the "correction changes behavior" beat).
Never cut: restart recall, cross-agent block, founder approval, board movement, cost view, Snyk block. Those are where the 50 Band plus Cognee points live.

## Band Desktop fallback (decide at 11:45)
1. Desktop install or sign-in fails on A's laptop: move the Band host to B's or C's laptop (Band reuses each tool's own login, so the host needs Claude Code and Codex signed in).
2. Owned runtimes (Codex, Claude Code inside Desktop) flaky: run Claude Code agents attached from terminals with `/jam as <role>`; run Drafter and Fixer as Codex via the Desktop New agent form only if it works, else temporarily as Band Python SDK agents (LangGraph adapter) and keep at least one Claude Code and one Codex agent live for the mixed-harness score.
3. Board API (beta) misbehaves: agents post task state as messages with the same `[CS]`/`[IR]` prefixes and the Chief of Staff reconciles; still record the board for the beats where it works.
4. Band entirely down: there is no honest substitute (Band is mandatory). Rely on the 14:15 safety recording and the latest good capture; tell judges.

## Installs and signups needing Vidyut's approval (exact items, approve at 11:00)
Band Desktop (band.ai/download) and Band account; `band-sdk[langgraph]==6.0.1`; `cognee[neo4j]==1.6.5` (already pinned without the extra); Docker image `neo4j:5.x` (exact tag); fastapi, uvicorn, httpx, pydantic, anthropic (exact pins); Snyk CLI (brew `snyk/tap/snyk` preferred over npm global) and a free Snyk account with a PAT; Node 20+ for the scorer; a Flexprice key (sponsor table). Read the scorer's `cli.mjs` before running it. Do NOT use the curl-pipe-sh `jam-installer.sh` fallback in SETUP.md without Vidyut reading it first.
