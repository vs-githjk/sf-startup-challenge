# Pitch and demo: how we show PrismKeep works

Written for the team that will present. Everything here uses synthetic companies (Lumen Analytics, Acme Logistics, Sarah Chen at Northline Ventures). Say that out loud once at the start. Update the "status" column as each beat is proven.

## 1. The pitch (90 seconds, spoken)

**Hook (10s).** "Founders make promises in every conversation. Last week you told a customer you'd fix SSO by Friday and told an investor you'd send a retention cohort. This week an AI writes the investor update, and says 'no churn risk'. Your customer said the opposite."

**Problem (15s).** Fundraising, sales and support run through the same two or three people. Promises get lost, and AI drafts now send messages fast enough to contradict each other.

**What we built (25s).** A team of six agents in one Band room. A Listener turns every call, ticket and meeting into promises, claims and risks and stores them in one Cognee memory. A Drafter writes the follow-up. A Brain checks every claim against memory and blocks what another conversation contradicts. Nothing is sent until the founder approves in Band, and the sent text must match the approved hash.

**Why it is not bolted on (15s).** Remove Cognee and the restarted Drafter forgets the promise and the Brain cannot catch the contradiction. Remove Band and there is no shared plan, no handoff, no approval and no per-agent cost.

**Business (15s).** Buyer is the founder or COO of a 3 to 30 person B2B startup. $99 a month with 1,000 credits. A processed conversation costs 10 credits, an approved message 5, a security-gated fix 20. Flexprice meters it, and credits gate expensive actions like deep investor research.

**Close (10s).** "Promises kept. Stories straight."

## 2. How we show it works in the real world

Judges distrust canned demos, so make it checkable:
1. **Say what is synthetic** (the company names), and that the pipeline is not: paste a transcript and watch the Listener extract it live. Offer to run a transcript the judge supplies.
2. **Show the brain, not just the page.** Open the Neo4j browser (localhost:7474) next to the site so the memory is visibly a graph that changes.
3. **Kill things on camera.** Stop the Drafter and the memory service, restart, and show recall still works. That is the proof of memory, not a screenshot.
4. **Show the receipts.** The approval hash on the page, the `.eml` in the outbox, the Flexprice dashboard events, the Snyk scorer number from a real run.
5. **Be honest about edges.** Outbox goes to a test inbox, metrics are seeded, the Band board is beta. Judges reward saying so.

## 3. Demo script (3 minutes, with exact commands)

### Before the room (do this 20 minutes early)
| Step | Command or action | Check |
|---|---|---|
| Memory up | `scripts/start-memory.sh` (Neo4j, Cognee, keep-api, smoke test) | prints "Memory is live" |
| Site | open http://127.0.0.1:8787 | header says "keep-api live", Cognee row green |
| Band | Band Desktop open, HQ and Eng rooms exist, agents attached | `band preflight` all ok |
| Flexprice | `bin/keep credits` | shows a balance; the low-credit customer `lumen_lowcredit` exists for the denial beat |
| Snyk | `scripts/snyk-scan.sh <lumen-app path>` once to warm | exits 1 with findings on the vulnerable app |
| Reset | `scripts/reset-lumen-app.sh`, clear test data in memory | ledger empty or only last-week history |
| Screen | 1080p, fonts large, no `.env`, tokens or keys visible | |

### The run
| Time | Say | Do on screen | Proves |
|---|---|---|---|
| 0:00 | Hook line, "everything here is synthetic" | Site hero, then Band HQ room | Band room |
| 0:15 | "Last week's calls go in through the same Listener" | Paste the Oct 13 Acme call and Northline meeting into HQ. Listener replies with promises and risks. Ledger and map fill in on the site. | Cognee write, live extraction |
| 0:45 | "Today a ticket arrives" | Paste Acme's ticket (CSV export shows another customer's rows). Chief of Staff recalls Acme (`[memory: rel_acme / ...]`), creates `[CS]` tasks, @mentions Fixer | Board, handoff, recall |
| 1:05 | "Security is a team member" | Eng room: Fixer patches, Security Reviewer runs Snyk, task BLOCKED, fix, rescan clean, Done. Show the finding stored in memory. | Snyk, Cognee, board |
| 1:30 | "Now we kill the Drafter and the memory service" | Stop both, restart. Fresh context. | Restart |
| 1:45 | "Same investor meeting, fresh agent" | Paste the Northline meeting. Drafter opens "As promised on Oct 13 ...". Its draft also says "no churn risk". Brain blocks it, citing the Acme call. Site shows the contradiction pair and a red line on the map. | Cognee across restart and across agents |
| 2:10 | "The founder corrects the brain" | Type: "@Brain Acme renewed for 12 months, forget the churn risk." Brain forgets and improves, Drafter redrafts. Map updates. | forget, improve |
| 2:30 | "Nothing leaves without approval" | Chief of Staff asks with `band ask`; approve. Outbox file appears; hash shown on the site. | Human in the loop, hash |
| 2:45 | "Every agent is metered" | Band usage view for tokens and cost; site cost panel; try Deep research on the low credit customer: denied. | Band cost view, Flexprice |
| 2:55 | End card | Real scorer number from a run, repo URL, team | Snyk |

### If something breaks
| Failure | Say and do |
|---|---|
| Band flaky | Play the safety recording made at 13:45 and narrate over it |
| Cognee recall misses a reworded question | Say so, then show the node in the Neo4j browser |
| Flexprice slow | Cost card from the local log, "Flexprice sync pending" is shown on the site |
| Snyk down | Reviewer posts the last scan with its timestamp |
| Site shows "offline store" | Run `scripts/start-memory.sh`; the Connections list tells you which tool is down |

## 4. Likely judge questions
| Question | Answer |
|---|---|
| How is this different from Granola, Notion or an investor CRM? | Each covers one side. None joins investors, customers and support in one memory and checks a draft against the other side before it is sent. |
| Why a team of agents and not one model? | Separation of duties. The agent that writes is not the one that checks, and the one that fixes code is not the one that clears it with Snyk. |
| Is the demo seeded? | The conversations are synthetic, but they go through the Listener live. `scripts/seed.py` is only a backup if the network drops. |
| What breaks without Cognee or Band? | See section 1. |
| How do you make money? | $99 a month plus credits, metered by Flexprice. |
| Security? | The reviewer blocks fixes until Snyk is clean and remembers repeat findings. Our repo scored 9.8 of 10 on the organizers' scorer (Rishit's run; re-run at freeze). |

## 5. What is proven today
| Beat | Status |
|---|---|
| Cognee remember, recall (reworded), forget on real Cognee | Run on this machine |
| Site live on keep-api, contradiction detected | Run on this machine |
| Flexprice event and gate denial from the live wallet | Run on this machine |
| Snyk Code clean, official scorer 9.8 | Rishit's run |
| Band room, @mention, board, approval, cost view | Not yet: no room exists |
| Restart recall on camera | Not yet |
| Listener and Brain registered in Band | Not yet |
