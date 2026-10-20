# PrismKeep PRD (5-hour build)

One line: PrismKeep remembers every promise you make to investors and customers, and never lets your agents send something your other conversations contradict.

## Problem
Founders of seed to Series A B2B companies run the raise, sales and support themselves. Promises leak across conversations ("we'll send the retention cohort", "SSO fix by Friday"), and AI-drafted follow-ups make it easy to tell an investor something a customer call from last week contradicts. Evidence: REPORTED pattern (founder investor updates, hand-kept CRMs). Named sources must come from `plan/research.md` before the README states them.

## User and buyer
User: the founder (approves every outbound message). Buyer: the founder or COO. Teammates use the Brain to ask "what did we promise X?".

## The one flow that must work (demo path)
1. A conversation (customer support ticket, customer call or investor meeting transcript) is posted into the Band HQ room.
2. Chief of Staff (Claude Code) recalls context from Cognee, sets the room goal and creates board tasks, and @mentions specialists.
3. Listener (LangGraph) extracts promises, claims, risks and owners and writes them to Cognee.
4. Customer side: Fixer (Codex) patches the promised bug in the sample customer app; Security Reviewer (Claude Code + Snyk) scans, blocks the task on a finding, stores it in Cognee as a recurring issue; Fixer fixes; reviewer unblocks.
5. Investor side: Drafter (Codex, fresh session after restart) recalls the open promise from the previous investor meeting and drafts the follow-up; Brain (LangGraph) checks every claim against company memory and blocks a claim a customer call contradicts.
6. Founder corrects in Band ("Acme renewed this morning"): Brain calls Cognee forget on the stale fact and improve with the correction; the draft is regenerated.
7. Founder approves in Band; the outbox sends only to the team's own test inbox (or writes an .eml) and records a SHA-256 of the approved text.
8. Cost: per-agent tokens and tasks are posted as a cost card and metered to Flexprice; credits gate the "deep investor research" action.
9. Brain answers "@Brain what did we promise Acme and who owns it?" from Cognee, with the Neo4j graph shown.

## Agent roster (6 agents, 3 harnesses, 2 rooms)
| Agent | Harness | Room | Job | Writes to Cognee | Reads from Cognee | Owner |
|---|---|---|---|---|---|---|
| Chief of Staff | Claude Code, attached (`/jam as architect`) | HQ, Eng | Lead: sets room goal, writes plan, creates and assigns board tasks, routes by @mention, asks the founder for approval, posts cost card | decisions, approvals (`company`) | relationship summary before planning (`rel_*`, `company`) | A |
| Listener | LangGraph (Band Python SDK) | HQ | Extracts promises (two-sided), claims, risks, owners, due dates from any conversation; quote-verified (Prism commitments agent) | promise, claim, risk (`rel_*`, `company`) | prior promises to dedupe and mark kept | B |
| Drafter | Codex (owned runtime) | HQ | Drafts investor follow-ups and customer replies | none directly (drafts go to outbox) | open promises and preferences (`rel_*`), company risks | A |
| Brain | LangGraph (Band Python SDK) | HQ | Track 8 knowledge OS: truth-checks every draft claim with evidence tiers, answers "what did we promise X, who owns it", applies founder corrections with forget and improve | correction, improve feedback | everything (`company`, `rel_*`, `eng_security`) | B |
| Fixer | Codex (owned runtime) | Eng | Technical specialist: patches the bug a customer was promised, in the sample customer app | code context notes (`company`) | recurring findings (`eng_security`) before coding | A (prompt), C (repo) |
| Security Reviewer | Claude Code (owned) + Snyk CLI | Eng, HQ | Runs `snyk code test` / `snyk test` on each fix, posts findings, blocks the task until a clean rescan, stores recurring issues; also runs the organizers' scorer on our own repo at checkpoints | finding with occurrence count (`eng_security`) | prior findings to mark "recurring" | C |

## Must-not-break invariants
1. Nothing leaves without a founder approval in Band; the approval hash must match the sent text.
2. Every claim in an outbound draft carries an evidence tier: Customer said, Investor said, Metric (seeded), Founder told us, Unverified. Unverified claims block send.
3. Agents read memory only through the `keep` interface (Cognee); no agent keeps a private copy of facts.
4. No real third-party data: all transcripts, companies and people are synthetic and labelled so.
5. Our repo's dependency tree stays small and pinned; Snyk scan of our repo runs before every checkpoint; nothing is merged that drops the security score.
6. No secrets in git, logs, Band messages or the video.
7. No em dashes or en dashes in copy, code or commits.

## Out of scope
Real email or calendar integration (outbox is a test inbox or .eml), real CRM import, auth and multi-tenant, audio capture (transcripts are pasted), a polished web app (Band is the UI; one read-only ledger page is a stretch), per-relationship rooms beyond HQ plus one Eng room.

## Success criteria (what a judge sees)
Band: two rooms (HQ, Eng), six agents on three harnesses, board moving To-do to Done, @mention handoffs, one founder approval and one founder correction, cost per agent. Cognee: recall across a Codex restart, recall across agents (customer fact used by investor-side Brain), forget plus improve, Neo4j graph. Flexprice: real usage events, credit gate. Snyk: blocked work item, recurring finding in memory, our repo's app-security-score result.
