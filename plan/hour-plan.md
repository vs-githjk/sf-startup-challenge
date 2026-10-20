# PrismKeep hour plan (run of show, team of 4)

Deadline D = 15:30 PDT (confirmed by Vidyut). Target: submitted by 15:00, then 30 min buffer.

## Lanes (split by layer of one product, not by track)
- **A (Vidyut): Band spine and agents.** Band Desktop host, HQ and Eng rooms, board conventions, Chief of Staff / Drafter / Fixer instructions, approval flow and outbox, merges at every checkpoint, demo driver and voice.
- **B: Memory.** keep-api and keep CLI over Cognee 1.6.5, Neo4j, data_id map, forget and improve, restart support, README architecture section.
- **C: Intelligence agents.** Synthetic seed data, Listener (port of Prism commitments prompt) and Brain (truth check with evidence tiers, founder corrections, Q&A) as LangGraph agents on the Band Python SDK, Devpost description.
- **D: Trust and billing.** Snyk baseline and scorer runs, Security Reviewer agent, the separate vulnerable `lumen-app` sample, Flexprice meters / wallet / credit gate / cost card, video edit, repo public.

Spine rules: A merges. B owns the keep interface and changes it only after posting the diff to the team. D can block any merge that lowers the security score.

## Timeline
| Clock | A (Band spine) | B (memory) | C (agents) | D (trust, billing) | Gate |
|---|---|---|---|---|---|
| 11:05 to 11:20 | Kickoff: everyone reads the hub page, lock name, approve installs | same | same | same | Idea lock |
| 11:20 to 11:45 | Band Desktop, `band init`, `band preflight`, HQ + Eng rooms, attach Claude Code `/jam as architect`, add a Codex agent. One @mention round trip, one task to completed, one `band ask`, one `band usage`. Test whether the task board is gated. | Neo4j container, keep-api skeleton owning Cognee; time one remember + recall + forget | Register one SDK agent at app.band.ai/agents, LangGraph hello world that answers an @mention in HQ | Snyk PAT, baseline `snyk test --all-projects` + `snyk code test` + scorer. Flexprice key from the sponsor table, send one event | **11:45 Band gate** |
| 11:45 to 12:30 | Chief of Staff instructions; Drafter and Fixer AGENTS.md; board conventions | keep-api + keep CLI + data_id map + event log + tests | Seed data (Acme call, Northline meeting 1, prior finding), Listener agent | Flexprice customer, meters, wallet, `keep cost`; `lumen-app` sample outside the repo | |
| **12:30 CP1** | A merges. Codex Drafter runs `keep recall` and quotes a seeded fact in Band | | Listener writes a promise from a transcript | scan before merge, score recorded | **CP1** |
| 12:30 to 13:15 | Approval and outbox with hash; cost card post | forget / improve; Neo4j view; restart script support | Brain truth check with evidence tiers; founder correction | Security Reviewer: scan, block, store finding in `eng_security`, unblock; Fixer recalls findings | 12:45 storyboard approve (A) |
| **13:15 CP2** | Full happy path once, ugly is fine | | | scan, score recorded | **CP2** |
| 13:15 to 13:45 | Restart moment script; rehearse handoffs | Paraphrase recall check; fixes | Brain Q&A (cuttable); Cognee section of description | Credit gate; cost card numbers | |
| **13:45 safety recording** | Drive one full run | watch memory events | watch agents | record screen | Safety video exists |
| **14:00 FEATURE FREEZE** | bug fixes only | bug fixes only | bug fixes only | final scan + scorer, record score | **Freeze** |
| 14:00 to 14:40 | 2 clean takes, voiceover | README: architecture, what breaks without Band / Cognee | Devpost description | Edit video to 3:00, captions, check every frame for secrets, make repo public | |
| 14:40 to 15:00 | Review video and text | Review README links | Fill submission fields | Upload video, incognito check | |
| **15:00 SUBMITTED** | Press submit | | | | **Submitted** |
| 15:00 to 15:30 | Buffer, pitch drill | buffer | buffer | buffer | D = 15:30 |

## Cut line (drop in this order if behind at CP2)
1. Brain Q&A beat (keep the truth check).
2. Credit gate (keep metering events and the cost card).
3. Fixer patching live (show a pre-run Eng room segment; Security Reviewer block stays live).
4. improve (keep forget).
Never cut: restart recall, cross-agent block, founder approval, board movement, cost view, Snyk block.

## Band Desktop fallback (decide at 11:45)
1. Desktop install or sign-in fails on A's laptop: move the Band host to another laptop that has Claude Code and Codex signed in.
2. Owned runtimes flaky: attach Claude Code from terminals with `/jam as <role>`; keep at least one Claude Code and one Codex agent live.
3. Board API (beta) gated: use the CLI `band work assign / take / board`; agents also post task state as `[CS]` / `[IR]` messages.
4. Band fully down: no honest substitute. Rely on the 13:45 safety recording.
