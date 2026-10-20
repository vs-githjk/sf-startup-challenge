# PrismKeep demo video script (3:00 max)

For Rishit, who produces the video. Vidyut drives the screens and records the voiceover.
Every number below was measured today. Don't add numbers that aren't here.

## The story in one breath
Founders make promises in every conversation, and AI now drafts their follow-ups. Nothing checks those drafts against what other stakeholders said. PrismKeep is a team of AI agents with one shared memory, and it stops a founder from telling an investor something a customer contradicts.

## Rules for the edit
- Synthetic data only. Show the "(synthetic)" label once on the title card.
- **Never show:** API keys, `.env`, `agent_config.yaml`, `.mcp.json`, real Prism meetings, the "(unattributed)" or "Total" rows in Band Analytics › Usage & Cost (that's personal laptop usage), or the $5,250 / $13k totals.
- Speed up agent "thinking" waits (2x to 8x) and add a small "sped up" tag. Never cut out a result.
- Captions on everything. Keep the voiceover calm and plain.

## Script

| Time | On screen | Voiceover (Vidyut) | Caption |
|---|---|---|---|
| **0:00–0:12** | Title card: PrismKeep logo + "Promises kept. Stories straight." | "Founders make promises in every conversation. Investors on Monday, customers on Tuesday, support tickets all week." | Synthetic data. Real agents, real memory. |
| **0:12–0:30** | Split screen: an investor email draft saying "no churn risk" next to a customer call quote, "we'll look at alternatives". | "And now AI writes the follow-ups. So it's easy to tell an investor 'no churn risk' when last week your biggest customer said they're looking at alternatives. Note-takers record, CRMs store, support bots answer. None of them checks what you're about to send against what everyone else told you." | The problem: one founder, many stories |
| **0:30–0:45** | Band Desktop, Hq room, participant list with 6 agents. | "PrismKeep is a team of six AI agents working in one Band room, sharing one memory in Cognee. Claude Code, Codex and LangGraph agents: a Chief of Staff, a Listener, a Drafter, a Brain, a Fixer and a Security Reviewer." | 6 agents · 3 different tools · 2 rooms |
| **0:45–1:05** | Prism meeting pulled into Hq (or the transcript pasted) → **Listener** reply: "stored 3 promises, 3 claims, 3 risks". Then a quick cut to the Neo4j graph. | "A meeting comes in from Prism, recorded by its Recall.ai bot. The Listener pulls out every promise, claim and risk, with quotes, into Cognee's knowledge graph." | Cognee memory: remember about 4 s, recall about 1 s |
| **1:05–1:15** | Terminal: `band restart --as vidyut0712/drafter` → "Connected". | "Now we restart the Drafter. Its context is wiped." | Memory across a restart |
| **1:15–1:40** | Hq: the restarted **Drafter** opens with "As promised on Oct 13… retention cohort". The **Brain** posts BLOCK on "no churn risk", citing `[memory: rel_acme / "look at alternatives if SSO slips"]`. | "The fresh Drafter still remembers the promise from last week, because memory lives in Cognee, not the agent. Then the Brain checks every claim, finds the Acme call, and blocks it. One agent's memory just stopped another agent's mistake." | **The contradiction catch** |
| **1:40–1:55** | Founder types "@brain Acme renewed this morning, forget the churn risk" → Brain: forgot X, believes Y → Drafter redrafts. | "When the truth changes, the founder corrects the memory. Cognee forgets the stale fact, learns the new one, and the next draft changes." | Cognee forget + improve |
| **1:55–2:10** | Approval card (Approve / Edit / Reject) → Approve → "sent… sha256 14d9a1…". Work tab: tasks in Done. | "Nothing leaves without the founder. One click to approve, and the hash proves the email sent is exactly the one approved." | Human in the loop · audit record |
| **2:10–2:30** | Eng room: Fixer patches the Acme CSV leak → Security Reviewer: Snyk BLOCKED (path traversal) → fix → "Snyk clean, unblocked" → Done. | "Customer bugs get the same team. The Fixer patches the code, and our Security Reviewer runs Snyk and blocks the work until it's clean. Findings go into memory, so the Fixer recalls them before its next fix." | Snyk as a team member |
| **2:30–2:45** | Band Analytics: rows for chief-of-staff $0.54 and drafter $0.31 (crop out the rest); the "Hq $0.85" room badge; Flexprice dashboard with metered events and the credit wallet; PrismKeep web app (contradiction check, approval queue). | "Every agent's cost is tracked in Band and metered in Flexprice, so customers pay for what their agents do, and credits gate the expensive features." | Cost per agent → usage billing |
| **2:45–3:00** | End card with the results (below) + repo URL + team names. | "PrismKeep: your agents never tell an investor something your customers contradict." | |

## End card: results (all measured today)
- 6 agents · 3 different tools (Claude Code, Codex, LangGraph) · 2 Band rooms
- Real Cognee memory (Neo4j graph): remember about 4 s, recall about 1 s, forget + improve on founder correction
- The Listener caught a cross-meeting contradiction **unprompted** in rehearsal
- Security: **9.8 out of 10** on the organizers' Snyk scorer · dependencies cut from 213 to 62 by isolating Cognee in a container · Snyk's auto-fix PR (filelock) applied within a minute
- Cost per agent visible (chief-of-staff USD 0.54, drafter USD 0.31 for one investor follow-up) and metered in Flexprice
- Every send approved by the founder, with a sha256 hash on record
- *(Only if true by 3 PM: "N founders signed up / paid today")*

## Why we win (for the voiceover tone and Q&A)
- **The problem is real and specific:** founders running a raise and customers at the same time. The costly failure is an inconsistent story.
- **What exists doesn't solve it:** Granola and Otter take notes; Attio and Affinity store contacts; Intercom Fin answers tickets; Metal approves fundraise plans. None checks an outbound draft against **every** other conversation before it's sent.
- **How we solve it:** one memory across investors, customers and engineering (Cognee); a team of specialist agents that hand work to each other (Band); the founder approves every send; security and billing are part of the workflow (Snyk, Flexprice).
- **Pros:** catches contradictions before they cost a round · keeps every promise on a ledger · works from meetings Prism already records · audit trail for every send · security-gated fixes for customer bugs · pay-per-use.
- **Business:** Fundraise Sprint $199 (8 weeks) as the way in, Founder $99/mo, Team $299/mo, overage metered in Flexprice. Expansion: accelerators and VC platform teams buy it for their portfolio.

## Shot list (capture at 1080p+, terminal font 18 pt)
1. Hq participant list (6 agents) · 2. Listener reply (promises/claims/risks) · 3. Neo4j graph (localhost:7474) · 4. Terminal `band restart` · 5. Drafter "As promised on Oct 13" · 6. Brain BLOCK with memory citation · 7. Founder correction → forget → redraft · 8. Approve card → hash · 9. Work tab Done columns · 10. Eng room Snyk block → clean · 11. Band Analytics per-agent rows (cropped) + room $ badge · 12. Flexprice dashboard · 13. PrismKeep web app · 14. Snyk dashboard / scorer 9.8 · 15. Snyk bot PR merged
