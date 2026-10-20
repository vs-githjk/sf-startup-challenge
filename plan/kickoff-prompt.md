# Kickoff prompt (paste into Claude Code in the repo root, one per person, change the lane line)

You are building PrismKeep at a hackathon that ends 15:30 PDT (we submit by 15:00). Read plan/PRD.md, plan/plan.md (architecture, interfaces, security plan, tasks), plan/hour-plan.md (4 lanes, timeline) and plan/demo-script.md before writing code. plan/research.md has verified sponsor facts (Band CLI `band ask`, `band work`, `band usage`; Cognee 1.6.5 V2 API; Flexprice events; the organizers' Snyk scorer).

My lane: <A: Band spine and agents | B: memory (keep-api over Cognee, Neo4j) | C: intelligence agents (seed data, Listener, Brain) | D: trust and billing (Snyk, Security Reviewer, Flexprice)>. Work only on my lane's tasks, on branch build/<lane>. The keep CLI interface in plan.md is the contract between lanes; do not change it without telling the team.

Rules: exact-pinned Python deps via uv only, no npm in the repo; no install, signup or outbound message without my approval of that exact item; no secrets in code, logs or Band messages, never read .env; parameterised queries, no shell=True, no eval; all data synthetic; no em dashes or en dashes anywhere; never add Co-Authored-By or any attribution trailer to commits; stage only files you changed; never push unless I say push. Write the failing test first for every task.

Lane A first tasks: T2 (Band spine), T6 (approval and outbox), T7 (restart moment).
Lane B first tasks: T3 (keep-api over Cognee), T4 Neo4j view, forget / improve.
Lane C first tasks: T4 seed data, T5 (Listener and Brain agents).
Lane D first tasks: T1 (baseline Snyk scan), T8 (Flexprice), T9 (Security Reviewer with Snyk).

Checkpoints: 11:45 Band gate, 12:30 CP1, 13:15 CP2, 13:45 safety recording, 14:00 feature freeze, 15:00 submitted. Run `scripts/security-score.sh --quick` before every checkpoint merge.
