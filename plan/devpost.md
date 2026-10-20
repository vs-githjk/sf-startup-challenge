# Devpost project description (paste into the form)

## Inspiration
Founders make promises in every conversation, and AI now drafts their follow-ups. We kept seeing the same failure: telling an investor "no churn risk" while your biggest customer is threatening to leave. Nothing checks a draft against everything else you've been told.

## What it does
PrismKeep is a team of six AI agents that runs a founder's follow-ups. The agents share one Cognee memory of every investor meeting, customer call and support ticket. The Listener extracts promises, claims and risks; the Drafter writes follow-ups from memory; the Brain checks every claim against everything any stakeholder said and blocks contradictions; the founder approves every send in Band, and a sha256 hash records exactly what went out. Customer bugs go to a Fixer, and a Security Reviewer gates the fix with Snyk.

## Our agent team (roles, tools, handoffs)
- **Chief of Staff** (Claude Code, Hq + Eng): recalls first, writes the plan on the Band board, hands off by @mention, asks the founder to approve, pulls meetings from Prism via MCP.
- **Listener** (LangGraph on the Band SDK, Hq): extracts two-sided promises, claims and risks with exact quotes into Cognee.
- **Drafter** (Codex, Hq): drafts follow-ups from memory with an evidence label on each claim.
- **Brain** (LangGraph on the Band SDK, Hq): checks claims, blocks contradictions, applies founder corrections with forget + improve.
- **Fixer** (Codex, Eng): patches the bug a customer was promised.
- **Security Reviewer** (Claude Code + Snyk, Eng + Hq): blocks the task until Snyk is clean; stores repeat findings.
Handoffs are @mentions in Band rooms; work moves on the shared board from To-do to Done; the founder decides through Band approvals.

## How we use Cognee
Cognee 1.6.5 runs as its own container with Neo4j. Agents write memory during work (`remember`) and read it before acting (`recall`). In the demo, a restarted Drafter recalls last week's promise, and the Brain uses the Acme customer call to block an investor claim: memory across a restart and across agents. Founder corrections call `forget` and `improve`. Datasets: company, rel_<counterparty>, eng_security.

## Flexprice
Every task and approved send is metered (agent_tokens, agent_tasks, approved_outbound) against a workspace customer with a 1,000-credit prepaid wallet; the credit gate reads the live balance before expensive actions. Agent costs from Band are passed through as credits.

## Snyk
A Security Reviewer agent runs Snyk Code on every fix and blocks the work item until it's clean, then stores repeat findings in Cognee. Our repo scores 9.8/10 on the organizers' scorer; isolating Cognee in a container cut our dependencies from 213 to 61; the repo is monitored in Snyk, and Snyk's own fix PR was applied within minutes.

## How we built it
Band Desktop (owned Claude Code and Codex runtimes, plus Band SDK LangGraph agents), Cognee + Neo4j in Docker, a FastAPI memory service (`keep`), Flexprice cloud, Snyk CLI and dashboard, a React web app, and Prism's read-only MCP for meeting intake.

## Challenges
Getting six agents built with three tools to share one memory safely (one process owns Cognee); macOS certificate issues on Band's WebSocket; Snyk reading our Python version wrong (fixed with a 3.12 pin); keeping the security score high with a heavy memory dependency (solved by isolating it in a container).

## What's next
Automatic intake from Prism's Recall.ai bot and email-forwarded tickets, a Fundraise Sprint plan ($199 for 8 weeks), and licensing to accelerators for their portfolio companies.
