# Kickoff prompt (paste into Claude Code in the repo root, one per person, change the lane line)

You are building PrismKeep at a 5-hour hackathon (ends 16:00 PDT, assumed). Read plan/PRD.md, plan/plan.md (architecture, interfaces, security plan, tasks), plan/hour-plan.md and plan/demo-script.md before writing code. plan/research.md has verified sponsor facts (Band CLI `band ask`, `band work`, `band usage`; Cognee 1.6.5 V2 API; Flexprice events; the organizers' Snyk scorer).

My lane: <A: Band spine and agents | B: memory and data | C: trust, billing, video>. Work only on my lane's tasks in plan/plan.md, on branch build/<lane>. The keep CLI interface in plan.md is the contract between lanes; do not change it without telling the team.

Rules: exact-pinned Python deps via uv only, no npm; no install, signup or outbound message without my approval of that exact item; no secrets in code, logs or Band messages, never read .env; parameterised queries, no shell=True, no eval; all data synthetic; no em dashes or en dashes anywhere; never add Co-Authored-By or attribution trailers to commits; stage only files you changed; never push unless I say push. Write the failing test first for every task.

First three tasks for lane A: T2 (Band spine), T6 (approval and outbox), T7 (restart moment).
First three tasks for lane B: T3 (keep-api over Cognee), T4 (seed data and Neo4j), T5 (Listener and Brain agents).
First three tasks for lane C: T1 (pins and baseline Snyk scan), T8 (Flexprice), T9 (Security Reviewer with Snyk).

Checkpoints: 12:30 CP1, 13:30 CP2, 14:15 safety recording, 14:30 feature freeze. Run `snyk test --all-projects` and `snyk code test` before every checkpoint merge.
