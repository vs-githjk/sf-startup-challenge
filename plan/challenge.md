# SF Startup Challenge Hackathon — Oct 20, 2026, AWS Builder Loft (5-hour sprint, team of 3)
Theme: Build an AI-native startup run by a team of agents, using Band Desktop and Cognee.

## Mandatory
1. Band Desktop (band.ai/download, docs.band.ai/jam, CLI: brew install thenvoi/tap/jam): 2+ agents in one shared room (mixed harnesses e.g. Claude Code + Codex/Copilot/OpenCode/LangGraph/CrewAI scores higher); lead/architect agent writes plan, agents claim work items To-do -> Done; agents @mention each other with context (no human copy-paste); >=1 real human decision/approval through Band; demo shows rooms, work board, per-agent sessions/tokens/estimated cost.
2. Cognee Open Source (github.com/topoteretes/cognee) as WORKING memory: agents write during work (decisions, customer insights, code context, review findings); agents recall to change next action, shown across a session restart or between two different agents. Extra credit: improve / forget, Neo4j graph backend.
3. Deep integration: removing Band or Cognee must break the demo; bolted-on = disqualification.

## Bonus
- Flexprice (+10%): meter real usage events (API calls, tokens, tasks, reports) into usage/credit/tiered/hybrid pricing. Top marks: metering drives product (credits gate features, Band agent costs passed through to customer billing).
- Snyk (+10%): security-reviewer agent in the Band room runs Snyk, posts findings, blocks work item until fixed, stores recurring issues in Cognee.

## Judging
Band 25% · Cognee 25% · Startup viability 20% · Technical execution & demo 20% · Innovation 10% · Flexprice +10 · Snyk +10

## Deliverables
Working prototype, repo, 2-3 min demo video (Band room, board moving, human decision, cost view, Cognee recall changing an agent's behavior), project description (problem, agent team roles/harnesses/handoffs, Cognee use, Flexprice/Snyk use), optional pitch deck.

## Suggested tracks the team is combining
- Track 6 Investor & Fundraise Copilot: research agent, deck-and-memo agent, follow-up agent in a fundraise room; Cognee = relationship memory for every investor, meeting, promise.
- Track 8 Startup Knowledge OS (LLM Wiki): Cognee builds/maintains a living company wiki; curator and Q&A agents keep it current and route questions to the right owner.
- Track 3 AI Customer Success Squad: triage, billing, technical specialist agents share one room per case, humans step in for refunds; Cognee = customer history and known fixes; Flexprice shows usage and invoice context to the billing agent.

## Team prior art (reuse allowed)
- Prism (~/Prism-private, also a PrismAI MCP connector): meeting copilot. Orchestrator routes a meeting transcript to 7 specialized agents in parallel -> decisions, owners, summaries, follow-up emails, health score in ~30s. Has a landing page with WebGL prism.
- BetterBill (~/LA-Hacks-2026, LA Hacks 2026): bill-audit / bill-intelligence product, Bun/Turbo monorepo.
