# PrismKeep demo script

All data is synthetic (Lumen Analytics, Acme Logistics, Northline Ventures). Say so on the first title card. Seeded before recording: Acme customer call (Oct 13: SSO fix promised by Friday, "we will look at alternatives if SSO slips"), Northline meeting 1 (Oct 13: founder promised the retention cohort by Oct 16), one prior security finding (raw SQL in an export path, Sep).

## 3 minute version (main video, cap 3:00)

| Time | Screen | What happens | Voice (Vidyut) |
|---|---|---|---|
| 0:00 to 0:12 | Title card, then Band HQ room | Name and one line | "Founders make promises in every conversation. PrismKeep's agents remember all of them, and never send an investor something your customers contradict." |
| 0:12 to 0:35 | HQ room, board | Founder pastes Acme's support ticket ("CSV export shows another customer's rows"). Chief of Staff (Claude Code) recalls Acme from memory, posts `[memory: rel_acme / SSO fix promised by Fri, churn risk]`, sets the goal, creates `[CS]` tasks, @mentions Listener and Fixer. | "One room, six agents on Claude Code, Codex and LangGraph. The lead writes the plan and the board." |
| 0:35 to 1:05 | Eng room | Fixer (Codex) recalls `eng_security` ("raw SQL in export, seen before"), patches. Security Reviewer runs Snyk, finds an issue, sets the task BLOCKED, stores it as recurring (2nd occurrence). Fixer fixes, rescan clean, unblocked, Done. | "Security is a team member. Snyk blocks the work item, and the finding becomes company memory, so next time the fixer starts from it." |
| 1:05 to 1:20 | Terminal split with Band | Restart: Drafter's Codex session and keep-api are killed and restarted on camera. | "Now we kill the drafter and the memory service. Fresh session, empty context." |
| 1:20 to 1:50 | HQ room | Founder pastes the Northline partner meeting transcript. Listener logs promises. Drafter (fresh) drafts the follow-up and opens with "As promised on Oct 13, here is the retention cohort" `[memory: rel_northline]`. Its draft also says "no churn risk this quarter". Brain blocks that claim: `[memory: rel_acme / Acme: alternatives if SSO slips]`, evidence tier Unverified vs Customer said. | "The drafter remembered a promise across a restart. A different agent caught a claim our own customer call contradicts. Nobody copy-pasted anything." |
| 1:50 to 2:15 | HQ room, then Neo4j | Founder types: "@Brain Acme renewed 12 months this morning, forget the churn risk." Brain calls forget and improve; graph updates in Neo4j; Drafter redrafts truthfully ("Acme renewed after we shipped the fix today"). | "When the founder corrects the brain, it forgets and learns, and the next draft changes." |
| 2:15 to 2:35 | HQ room approval | Chief of Staff asks for approval with the draft and its evidence tiers; founder replies approve; outbox sends to the test inbox; hash shown. | "Nothing leaves until the founder approves, and what is sent is exactly what was approved." |
| 2:35 to 2:52 | Band usage view, cost card, Flexprice | Per-agent tokens and tasks, cost card, Flexprice events and wallet; "Deep investor research" is gated: not enough credits. | "Every agent's work is metered in Flexprice. Credits gate the expensive actions." |
| 2:52 to 3:00 | End card | Security score of our repo from the organizers' scorer (real number), repo URL, team | "PrismKeep. Promises kept, stories straight." |

Brain Q&A beat ("@Brain what did we promise Acme and who owns it?") is the cut option: include it if the run is under 2:50, else show it in the README.

## 90 second version (pitch or sponsor cut)
0:00 one line. 0:10 Northline transcript in, board moves. 0:25 restarted Drafter recalls the Oct 13 promise. 0:40 Brain blocks the churn claim citing Acme's call. 0:55 founder correction, forget, redraft. 1:10 approve, cost card, Snyk block shown as a still from the Eng room. 1:25 end card.

## Fallbacks
- Live judging and Band or network flaky: play the recorded video (record the first clean full run as soon as it exists, by 14:15, even if rough).
- Cognee recall misses on stage: the runbook has the exact rehearsed queries; if a judge asks a paraphrase and it misses, say so plainly and show the Neo4j node.
- Flexprice down: cost card from the local log labelled "Flexprice sync pending".
- Snyk down: Security Reviewer posts the last scan with its timestamp.

## Capture checklist (Person C)
Band HQ and Eng rooms full screen at 1080p or higher, board visible; terminal font 18pt; Neo4j browser pre-styled; Flexprice dashboard logged in; no tokens, emails or keys on screen (check every frame of the Flexprice and Snyk screens).
