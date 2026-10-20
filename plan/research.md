# Research: Prism for Founders (Track 6 + 8 + 3 combo)
SF Startup Challenge, 2026-10-20. Written 10:55 PDT by Master Finder. Inputs: plan/challenge.md, six parallel research runs, my own spot checks.

## Plain answer first
1. **The market gap is real.** No product we found joins investor meetings, customer calls and support tickets into one founder memory with a promise ledger and per-message founder approval. Every competitor covers one side: investors (Visible, Foundersuite, Metal), sales (Day.ai, Lightfield, Attio), support (Fin, Pylon, Plain) or internal docs (Notion, Glean, Guru).
2. **The hackathon gap is narrower.** Judges have already seen "Cognee company brain / LLM wiki", which Cognee has run as an event theme at least 4 times. They have also seen "Band crisis room + human approves + audit trail", the shape all 3 Band of Agents winners used. A generic "wiki of everything" will read as a cliche.
3. **Sharpest wedge: "never tell two stakeholders two different stories."** One memory catches cross-context contradictions before the founder sends anything. Demo beat: the investor-update agent drafts "Acme is expanding". Cognee recalls yesterday's Acme support ticket (churn threat) and Flexprice usage (Acme's usage fell 40%). The draft is rewritten, and the founder approves it in Band. Flexprice is the ground truth for the traction numbers, and Cognee forget() handles "that was off the record".
4. **Who pays:** seed to Series A founders, about $49 to $99 per month per founder seat plus metered agent credits. That sits between note-takers ($14 to $25 per seat) and the serious tools (Lightfield $999/mo, Affinity $2,000 per user per year).
5. **Biggest build risks:** (a) Snyk score: the organizers' scorer zeroes a repo with more than 10 findings above low, and putting cognee in our lockfile pulls in 173 packages. Today OSV shows 1 MODERATE advisory with no fixed version (details in section 3, Snyk). (b) The Band SDK task board is Beta and "gated on the platform". Fallback: the CLI `band work assign/take/room-status/board` (VERIFIED in `band --help`, 10:57). (c) Self-hosting Flexprice is a heavy stack. Human approval is solved: `band ask --prompt ... --option ...` waits for a structured human answer in the room (VERIFIED in `band ask --help`).

## 1. Competitive landscape
Fetched 2026-10-20 between 10:50 and 10:53 PDT. VERIFIED means we read the vendor's own page. REPORTED means the source was a third party or a search snippet. Prices are as quoted on the page; monthly versus annual labels on Attio, Fathom and Read.ai were parsed by a fetch tool, so check them live before quoting them on stage.

### A. Investor CRMs and fundraise copilots
| Product | What it does | Pricing | Gap our idea fills | State |
|---|---|---|---|---|
| Affinity | Relationship-intelligence CRM for VCs: relationship graph, warm intro paths, Notetaker, "Ascend" agents, hosted MCP | Essential "$2,000 per user/year", Scale $2,300, Advanced $2,700, annual only ([affinity.co/pricing](https://www.affinity.co/pricing)) | Investor-side tool priced for funds; no customer or support context; no founder approval queue | VERIFIED |
| Attio | General AI CRM: Ask Attio, custom agents, research agent, call intelligence, credits | Free $0; Plus $35 annual / $44 monthly per seat; Pro $79 / $99 ([attio.com/pricing](https://attio.com/pricing)) | Horizontal toolkit; founder must build fundraise, customer and promise workflows | VERIFIED |
| Visible.vc | Founder fundraise pipeline and investor updates, "AI Inbox", MCP | Starter $0; Base "$59 per month / billed annually"; Core $129; Growth $199 ([visible.vc/pricing](https://visible.vc/pricing)) | Investors only; updates are template and metric driven, not built from real conversations | VERIFIED |
| Foundersuite | Investor CRM, investor database, updates, AI-drafted outreach | Basic "$0 free forever"; Silver "$745 billed annually"; Gold $1069; Platinum $1609 ([foundersuite.com/pricing](https://foundersuite.com/pricing)) | Shallow AI (drafting only); no call ingest, no graph | VERIFIED |
| DocSend (Dropbox) | Deck sharing, view analytics, data rooms | Personal $10, Standard $45 per user/mo, Advanced $150/mo (3 users) ([docsend.com/pricing](https://www.docsend.com/pricing), page BLOCKED for automation; search snippet) | A document channel, not memory; could be an input signal | REPORTED |
| Carta | Bought ListAlpha (Mar 2026), Carta CRM, LP CRM (Apr 2, 2026), Claude CRM plugin | No public CRM price; Carta Launch free for early founders ([carta.com/product-updates/lp-crm](https://carta.com/product-updates/lp-crm)) | Built for fund managers raising from LPs, not founders | VERIFIED |
| Metal (Raise Agent) | AI fundraise copilot: "Investor Memory Layer", meeting intelligence, investor updates, MCP; Agent Mode (Aug 2026) where the founder approves the plan | No public prices; "$600 per quarter to $5,500 annually" (REPORTED) ([metal.so/pricing](https://metal.so/pricing)) | **Closest fundraise competitor.** Memory is an investor database, not the founder's own relationships; no customers or support; approves plans, not each message | VERIFIED (product), REPORTED (price) |
| Fundraisly | AI agent plus human service for warm paths and outreach (Product Hunt, Jun 2026) | $1k / $3k / $5k per month (REPORTED, theaiagentindex.com) | Outbound sourcing service; no memory of the founder's own conversations | REPORTED |
| RoundOS | Pulls investor context from email and calls, flags stale threads, drafts follow-ups, founder stays in control | Not found (page BLOCKED) | Closest in philosophy but investors only and very early | REPORTED |

### B. Meeting copilots with memory
| Product | What it does | Pricing | Gap | State |
|---|---|---|---|---|
| Granola | Notes, chat across meetings, Recipes, pre-meeting briefs, follow-ups, MCP, pushes to Attio/Affinity/HubSpot | Basic $0, Business "$14 per user per month", Enterprise $35 ([granola.ai/pricing](https://www.granola.ai/pricing)) | Memory is a pile of notes, not a graph; meetings only; no promise ledger | VERIFIED |
| Fireflies | AskFred, AI apps, voice agents, CRM sync | Pro $10/$18, Business $19/$29, Enterprise $39 (REPORTED; vendor page shows no prices) | Horizontal note-taker | REPORTED |
| Otter | Chat across meetings, Sales and SDR agents, MCP | Pro $8.33 annual / $16.99 monthly; Business $19.99 / $30 ([otter.ai/pricing](https://otter.ai/pricing)) | Role agents for sales and recruiting; nothing for founders | VERIFIED |
| Fathom | Ask Fathom, CRM field sync, follow-up emails, Deal View | Premium $16 / $20; Business $25 / $34 ([fathom.ai/pricing](https://fathom.ai/pricing)) | Deal View is sales account memory only | VERIFIED |
| Read.ai | Summaries across meetings, email and chat; search copilot | Pro $15 / $19.75; Enterprise $22.50 / $29.75 ([read.ai/plans-pricing](https://www.read.ai/plans-pricing)) | Broad intake but no commitments graph, no investor flows | VERIFIED |
| Circleback | Notes, action items, email drafts, automations into Attio, HubSpot, Salesforce | Pro "$15/user/month", Business $25, Enterprise $35 ([circleback.ai/pricing](https://circleback.ai/pricing)) | Extracts action items, never follows them up over time | VERIFIED |
| Day.ai | AI-native CRM; "Every agent knows what every call, email, and meeting has ever taught you"; per-agent pricing; Sequoia-led $20M Series A | Free; Turbo "$24/month" per agent; Professional $60; Executive $200 ([day.ai/pricing](https://day.ai/pricing)) | **Closest architecture** (memory + agents + follow-ups) but for revenue teams; no investor or support flows | VERIFIED |
| Lightfield | AI CRM replacing "CRM, call recorder, sequencer, and enrichment" | Starter "$89/mo", Pro "$999/mo", Growth "$1,999/mo" ([lightfield.app/pricing](https://lightfield.app/pricing)) | Sales team tool; outbound is sequences, not founder-approved one-offs | VERIFIED |

### C. Company knowledge and wiki AI
| Product | What it does | Pricing | Gap | State |
|---|---|---|---|---|
| Glean | Enterprise search and agents over company apps | No public price; about $45 to $50 per user/mo, roughly 100-seat minimum (REPORTED, sentra.app, getmacha.com) | Enterprise only; internal docs, not outside relationships | REPORTED |
| Notion AI | Wiki, Notion Agent, AI Meeting Notes, Custom Agents | Plus $10, Business $20 per member/mo; Custom Agents "$10 per 1,000 monthly Notion credits" ([notion.com/pricing](https://www.notion.com/pricing)) | **Main platform threat** (fastest copycat). Pages are maintained by people; no relationship graph or promise ledger | VERIFIED |
| Guru | Verified company knowledge, Knowledge Agents | Custom quotes only ([getguru.com/pricing](https://www.getguru.com/pricing)) | Internal, verified by hand | VERIFIED |
| Dashworks | Workplace AI search; HubSpot agreed to acquire it Apr 16, 2025 ([hubspot.com](https://www.hubspot.com/company-news/hubspot-to-acquire-dashworks)) | No standalone price | Shows that CRMs want this context layer | VERIFIED |
| Mem | Personal AI notes, voice capture, proactive agent | Free; Plus $9; Pro $29; up to $199/mo ([get.mem.ai/pricing](https://get.mem.ai/pricing)) | Single user, not a company memory | VERIFIED |

### D. AI customer success
| Product | What it does | Pricing | Gap | State |
|---|---|---|---|---|
| Intercom Fin | AI support agent and helpdesk | "$0.99 per outcome"; seats $29 / $85 / $132 ([intercom.com/pricing](https://www.intercom.com/pricing)) | Tickets only; auto-resolves; no founder or investor memory | VERIFIED |
| Decagon | Enterprise support agents | No public price; about $50K/yr platform fee (REPORTED, fin.ai, a competitor's page) | Enterprise, support only | REPORTED |
| Sierra | Outcome-priced customer agents ("paid only when we complete a task") ([sierra.ai blog](https://sierra.ai/blog/outcome-based-pricing-for-ai-agents)) | Rates unpublished; $150K+ license (REPORTED) | Customer-facing, no founder memory | VERIFIED (model), REPORTED (price) |
| Pylon | B2B support with AI agents and account intelligence | $89 / $139 per seat; Account Intelligence "$10 per customer account/month" ([usepylon.com/pricing](https://www.usepylon.com/pricing)) | Closest support tool to relationship memory; customers only | VERIFIED |
| Plain | API-first B2B support, Ari agent | $45 / $99 per user; Ari "100 credits per resolution", 1,000 credits = $10 ([plain.com/pricing](https://www.plain.com/pricing)) | Support queue only | VERIFIED |

### E. Founder "chief of staff" products
- **readywhen**: "24/7 AI Chief of Staff for commitments and follow-ups", "Nothing sends without your sign-off"; launched on Product Hunt Jun 22, 2026 ([hunted.space/dashboard/readywhen](https://hunted.space/dashboard/readywhen)). It is the closest on promises plus approval, with no wiki, specialist agents or support intake. REPORTED.
- **Taskade Founder OS**: agent templates for investor research and updates ([taskade.com/agents/founder-os](https://www.taskade.com/agents/founder-os)). A template kit. REPORTED.
- **Agency** (Menlo, Series A): "AI operating system for customer relationships", customers only ([menlovc.com](https://menlovc.com/perspective/investing-in-agencys-series-a-the-ai-operating-system-for-customer-relationships/)). REPORTED.

## 2. Where the real white space is
**Is "one memory across investors + customers + team, run by an agent team, founder approves" differentiated?** In the market: yes, as a join. Each piece exists somewhere (Day.ai memory, Metal investor memory, readywhen promise sign-off, Pylon account memory), but no product found holds all stakeholders in one graph. In the room: only if the demo shows *why the join matters*. "We remember everything" is the cliche. **"The memory stops you contradicting yourself"** is the thesis nobody has shown.

**The sharpest wedge for 3 minutes: the Consistency Guard / Promise Ledger.**
- Founders' highest-stakes outbound messages are investor updates and key-account emails. Their worst failure is telling investor A one story while customer B and the billing data say another, or forgetting a promise.
- Demo arc (all four mandatory beats land naturally):
  1. A customer call transcript and a support ticket enter the Band room. Prism-style specialist agents (CS triage, billing) extract promises and risks and `remember` them in Cognee.
  2. The architect agent (Claude Code) writes the plan and creates board tasks. The investor-update agent (LangGraph via band-sdk) claims "Draft October investor update".
  3. Its first draft says "Acme expanding". It recalls from Cognee (an Acme churn-risk ticket plus the promise "SSO by Nov 1") and from Flexprice (Acme usage down), then rewrites the paragraph and @mentions the CS agent to confirm.
  4. The founder approves the outbound message in Band. Restart, or switch to a second agent: the follow-up agent recalls the "SSO by Nov 1" promise and schedules a nudge. The "off the record" investor remark is removed with `forget` and is provably gone from recall.
  5. The cost panel shows per-agent tokens (Band usage events) converted to dollars and metered into Flexprice credits. The founder's plan runs out of credits, which gates the "auto-draft updates" feature.
- Why it beats the cliche: memory changes an action across contexts (the Cognee rubric line), and forget is the point, not decoration. That matches what won the WeMakeDevs x Cognee event (Lethe, "verifiable forgetting"). Flexprice is ground truth, not a bolt-on.

**Believable business:** seed to Series A founders and their first ops hire. A founder seat at about $49 to $99/mo plus metered agent credits (Flexprice) fits between Visible Base ($59/mo, investor-only) and Day.ai ($24 to $200 per agent per month). Expansion comes from team seats and per-customer-account memory, priced like Pylon's "$10 per customer account/month". Main threats: Notion (Custom Agents + Meeting Notes), Metal (fundraise side) and Day.ai (architecture). The defence is the founder-specific cross-stakeholder graph plus approval.

**Scope warning:** three tracks in 5 hours with 3 people is the top failure mode. Keep Track 8 (the wiki) as a *view* of the Cognee graph, not a feature. Track 3 supplies the inputs (ticket + billing). Track 6 supplies the high-stakes output (the investor update).

## 3. Sponsor tech facts the code needs
All read 2026-10-20 10:50 to 10:53 PDT from primary docs unless marked. Local check at 10:50: `jam` and `snyk` are **not installed** on this Mac (VERIFIED: `which jam` / `which snyk` gave "not found").

### Band (docs.band.ai)
- **Install (VERIFIED, github.com/thenvoi/homebrew-tap README):** `brew install thenvoi/tap/jam` (newer Homebrew may ask for `brew trust thenvoi/tap` first), then `jam --version`, `jam daemon install`, `jam init --user-api-key 'band_u_...'`, `jam doctor`. The user key comes from app.band.ai/users/settings. The formula is version 0.4.16, and `jam` is a symlink to `band`. **Band Desktop** is a separate DMG ([docs.band.ai/band-desktop](https://docs.band.ai/band-desktop.md)); it is not in brew yet.
- **Gotcha:** the binaries are not notarized. Fix: `xattr -dr com.apple.quarantine "$(command -v jam)" "$(command -v jamd)"`.
- **Rooms:** created in the Desktop UI ("Assign work ... Each send creates a room"). SDK agents have `band_create_chatroom`. A CLI `jam room create` is NOT FOUND (searched llms.txt, band-desktop.md, tap README); check `jam --help`.
- **Harnesses in Desktop (VERIFIED):** Codex, Claude Code, OpenCode, "ACP agent", plus GitHub Copilot at setup. To attach a running Claude Code session: Settings > General > Claude Code integration > Install integration (installs the `band-peer` plugin), then `/reload-plugins`, then `/jam as architect`. Attached sessions stay connected only while the window is open.
- **Custom agents (VERIFIED, my spot check: PyPI `band-sdk` 6.0.1, Python >=3.11):** `uv add "band-sdk[langgraph]"` or `"band-sdk[crewai]"`. Register at app.band.ai/agents > Connect Agent; the API key is shown once. Minimal code (from getting-started/connect-remote-agent):
  ```python
  from band import Agent
  from band.adapters import LangGraphAdapter
  from band.config import load_agent_config
  agent_id, api_key = load_agent_config("my_agent")  # agent_config.yaml
  adapter = LangGraphAdapter(llm=..., checkpointer=InMemorySaver())
  agent = Agent.create(adapter=adapter, agent_id=agent_id, api_key=api_key,
      ws_url=os.getenv("BAND_WS_URL", "wss://app.band.ai/api/v1/socket/websocket"),
      rest_url=os.getenv("BAND_REST_URL", "https://app.band.ai"))
  await agent.run()
  ```
  Adapters: LangGraph, Anthropic, PydanticAI, ClaudeSDK, Codex, Opencode, CrewAI, CrewAIFlow, CopilotSDK, Gemini, GoogleADK, Letta, Agno, Strands and more. Built-in tools include `band_send_message` (with @mentions), `band_add_participant` and `band_create_chatroom`. Agents reportedly receive only messages that @mention them (REPORTED, search snippet).
- **Work board (VERIFIED, Beta):** add `capabilities={Capability.TASKS}` to get `band_create_task`, `band_update_task`, `band_list_tasks`, `band_get_board` and `band_set_board`. REST: `POST /api/v1/agent/chats/{chat_id}/tasks` {subject, detail} and `POST .../tasks/{id}` {status, comment, ...}. Statuses are `pending, in_progress, blocked, in_review, failed, completed` (there is no literal "To-do"/"Done"; map pending to To-do and completed to Done in the pitch). The first status write claims the task. **Docs warning, quoted:** "gated on the platform; where it is off, these tools return not-found errors." Test this in the first 20 minutes.
- **CLI facts from the installed binary (VERIFIED, `~/.local/bin/band --help`, v0.4.16, 10:57 PDT):**
  - `band ask --prompt "<q>" --option Approve --option Edit --option Reject [--json]` means "Ask a human in the bound room a structured question and wait for the answer". It uses "the same daemon-owned Work/HITL path as provider hooks, so a human can answer from the desktop". **This is our generic human approval for any agent.** A Python agent can shell out to it.
  - The shared board on the CLI (Layer 2): `band work assign` (create a shared task on a room board), `band work take` (join it), `band work room-status`, `band work board`, `band work history`.
  - `band usage` gives "Token usage and catalog-estimated USD equivalents for this machine's coding agents (ccusage-backed; not provider billing)". The bundled README says Desktop "Analytics > Usage & Cost" shows the same, cached 120s by the daemon and polled every 60s by the desktop. So per-agent USD exists for Claude Code and Codex. For band-sdk custom agents, compute it from `Emit.USAGE` tokens (UNRESOLVED whether Desktop prices those).
  - `band connect request/accept` pairs two machines' coding agents into one fresh room with one copy-paste line (useful for a team of 3 on 3 laptops). `band room list/messages/send/participants` reads and writes human rooms.
- **Approvals via SDK (VERIFIED):** documented for `CodexAdapter(config=CodexAdapterConfig(approval_mode="manual", approval_wait_timeout_s=300.0))`: "Participants reply with `/approve <token>` or `/decline <token>` in the chat room." In Desktop, Claude Code permission prompts appear in the room. A generic approval call in the SDK docs: NOT FOUND (searched band-desktop.md, sdks reference, coding-agents tutorial). **Plan:** the outbound agent calls `band ask` (above). Fallback: post "APPROVAL NEEDED <token>" and wait for `/approve <token>`.
- **Cost (VERIFIED partial):** `Emit.USAGE` emits per-turn token-usage events (on by default for LangGraph, Anthropic, Gemini, PydanticAI and Strands; **CrewAI raises BandConfigError with USAGE**). Desktop "shows rooms, tasks, activity, and usage". For coding agents, `band usage` and Desktop Analytics give catalog-estimated USD (see the CLI facts above). For SDK agents, compute USD from tokens times model price. Either way, send the same numbers to Flexprice as `llm_tokens` events.
- **Pricing (subagent read band.ai/pricing, not re-fetched by me):** Free $0, "Single user account (personal, non-commercial use)", 20 remote agents, 250 active rooms, 2-week retention; Pro $17.99/mo.

### Cognee OSS (VERIFIED from source at tag v1.6.5; my spot check: PyPI 1.6.5, `requires_python <3.15,>=3.10`)
- Install: `pip install "cognee[neo4j]==1.6.5"` (add `anthropic` if Claude is the LLM). **Pin the version:** releases ship weekly, and memify is "removed in the next release".
- **V2 API (all async):** `await cognee.remember(text, dataset_name="founder")`, `await cognee.recall("What did we promise Acme?", datasets=["founder"])`, `await cognee.improve(dataset="founder", session_ids=[...])`, `await cognee.forget(data_id=...)` or `forget(dataset=..., memory_only=True)`. V1 `add / cognify / search(query_type=SearchType.GRAPH_COMPLETION)` still works. `node_set=[...]` on add and `node_name=[...]` on recall/search scope by stakeholder (use node sets like `investor:sequoia` and `customer:acme`). **memify is deprecated; say "improve" in the pitch.**
- Session memory: `remember(..., session_id=...)` writes a fast cache and bridges to the graph in the background (debounced). That is a natural "agent writes during work" story, but await it before demoing recall.
- **Config env:** `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY`; Anthropic is supported. Embeddings: `EMBEDDING_PROVIDER` (default openai `text-embedding-3-large`, 3072 dims). Anthropic has no embedding model, so set `EMBEDDING_PROVIDER` explicitly (openai or fastembed). Defaults: sqlite + lancedb + kuzu, file-based. **Neo4j:** `GRAPH_DATABASE_PROVIDER=neo4j`, `GRAPH_DATABASE_URL=bolt://localhost:7687`, `GRAPH_DATABASE_USERNAME`, `GRAPH_DATABASE_PASSWORD`; consider `ENABLE_BACKEND_ACCESS_CONTROL=false` with a single Neo4j Community instance.
- **Sharing memory between agents:** run ONE Cognee REST server (`python -m cognee.api.client`, port 8000, or the `cognee/cognee:main` Docker image with a named volume) and point every agent at it. The cognee-mcp server (tools `remember`, `recall`, `forget`) has an API mode, so Claude Code and Codex can share the same graph: `claude mcp add cognee-http -t http http://localhost:8000/mcp`.
- **Gotchas:** open issue #5254 (concurrent local LanceDB writers cause duplicates, so never let two processes write file stores; use the one server). #5987 (LanceDB deadlock when the collection does not exist yet; warm it up with one remember at boot). improve() takes a lock, so concurrent runs return `skipped: lock_held`. cognify costs LLM calls per chunk; use `dry_run=True` to estimate. Latency was not measured (UNRESOLVED: time one remember+recall at setup).

### Flexprice
- **Cloud (VERIFIED, docs.flexprice.io/developers/api-reference):** base `https://us.api.flexprice.io/v1`, header `x-api-key`. Cloud free tier and signup flow: NOT FOUND (searched api-reference, sdks/usage, llms.txt). Ask the Flexprice sponsor table for a hackathon key; that is faster than self-hosting.
- **Self-host (VERIFIED, repo README):** `git clone https://github.com/flexprice/flexprice && cd flexprice && make dev-setup`, API on `http://localhost:8080/v1`. Heavy: Postgres, ClickHouse, Kafka, Temporal, Redis. AGPL-3.0 core.
- **Events (VERIFIED):** `POST /events` and `POST /events/bulk` (up to 1000), both return 202. Fields: event_name, external_customer_id, event_id (idempotency), timestamp, properties (examples use string values). SDKs: `pip install flexprice` (my spot check: PyPI 2.1.40), `npm i @flexprice/sdk`. Exact snake_case JSON names are inferred; confirm them against `docs/swagger/swagger-3-0.json` in the repo.
- **Gating (VERIFIED partial):** `GET /customers/external/{external_id}/entitlements`, `GET /customers/usage`, `POST /creditgrants`; wallets via the CLI (`flexprice wallets create / top-up / balance`). A meter aggregation schema (COUNT/SUM) and a single "is feature allowed" boolean endpoint are NOT FOUND, so gate by reading entitlements plus usage or wallet balance. Ingestion is async, so balances lag; do not demo "credits run out" within a second of an event.
- Meter ideas: `agent_task` (count), `llm_tokens` (sum of properties.tokens, from Band USAGE events), `approved_outbound` (count). Credits gate "auto-drafted investor update".

### Snyk
- Install (VERIFIED, docs.snyk.io): `npm install snyk -g` or `brew tap snyk/tap && brew install snyk/tap/snyk`. Auth: OAuth by default; for agents use the `SNYK_TOKEN` env var (`snyk auth --auth-type=token`).
- `snyk test --json` and `snyk code test --json` / `--sarif`. Exit codes (VERIFIED for `snyk test`): 0 clean, 1 vulns found (block the task), 2 failure (retry), 3 no supported project. Treat 2 and 3 as errors, never as clean. Snyk Code must be enabled in the org (REPORTED).
- Free plan: about 100 Snyk Code tests per month (REPORTED, snyk.io/plans snippet).
- MCP (VERIFIED): `npx -y snyk@latest mcp -t stdio`, which offers tools such as `snyk_code_scan` and `snyk_sca_scan`.
- **Organizers' scorer (VERIFIED, [github.com/javiergarza-snyk/app-security-score](https://github.com/javiergarza-snyk/app-security-score) README, HTTP 200, 10:56 PDT):** clones the public repo, runs `npm`/`yarn`/`pnpm`/`pip`/`uv install` in a sandbox, then runs `snyk test` + `snyk code test`. Quote: "Score = `10 − (critical×3 + high×1 + medium×0.3 + low×0.1)`, floored at 0 across SCA + SAST combined; a repo with more than 10 findings above "low" severity is scored 0 outright." A Python project "with no supported lockfile" is reported under Notes and not counted as clean, so **commit a `uv.lock` or pinned `requirements.txt`.**
- **Cognee dependency risk (VERIFIED by me, 10:56 PDT; OSV used as a proxy because Snyk's own database needs a token, so Snyk may flag more or fewer):**
  - Method: resolved with `uv pip compile` (no install; Python 3.12), then queried every pinned package against `api.osv.dev/v1/querybatch`.
  - `cognee==1.6.5` alone resolves to 173 packages. `cognee[neo4j,anthropic]` resolves to 178. Adding `band-sdk[langgraph]==6.0.1` and `flexprice==2.1.40` brings it to 208.
  - In all three trees, exactly 1 package has advisories: `diskcache 5.6.3` (GHSA-w8v5-vhqr-4h9v / PYSEC-2026-2447, "DiskCache has unsafe pickle deserialization", severity MODERATE). The affected range is "last_affected 5.6.3", and 5.6.3 is the latest on PyPI, so **no fix exists; it cannot be upgraded away.** If Snyk rates it Medium, the score cost is about 0.3.
  - A thin client stack (`band-sdk[langgraph]`, `flexprice`, `httpx`: 77 packages) has 0 OSV advisories.
  - Leanest install: base `cognee==1.6.5` already bundles the local defaults (lancedb, ladybug graph, sqlite, fastembed, onnxruntime, litellm). It has no "slim" extra, so do not add extras beyond `neo4j` and `anthropic`.
  - Architecture option that also fixes concurrency issue #5254: run Cognee as its own service (the `cognee/cognee:main` Docker image or a separate `memory/` service) and have agents call its REST API with httpx. Then the agent repo's lockfile stays thin. Be honest in the write-up: the memory service still carries the diskcache advisory. The scorer runs `snyk test --all-projects`-style scans over manifests it finds, so a `memory/requirements.txt` in the same repo would still be scanned (REPORTED, inferred from the README; not tested).
  - First-party code (Snyk Code, SAST) is the bigger lever: no hardcoded keys, no `subprocess` with `shell=True`, no `eval`, parameterized Cypher, no `pickle.load` on untrusted data. Lethe-style "forget" with an audit log helps both the story and the score. Natural fit: a Codex security-reviewer agent in the room (a mixed harness, plus native `/approve`) runs Snyk, sets the task to `blocked`, and `remember`s recurring issues in Cognee.

### Minimum setup path (first 30 minutes, in parallel)
1. Person A: install jam + Band Desktop; attach Claude Code as architect; create a room; **test the task board tools now** (they may be gated).
2. Person B: run the Cognee server (Docker, named volume) with Neo4j in Docker; one remember + recall smoke test; time it.
3. Person C: get a Flexprice key at the sponsor table (or start self-host in the background); send one event; read usage back. Install Snyk and run `snyk auth`.

## 4. Past hackathons with Band or Cognee (what judges have seen)
Fetched 10:50 PDT.
- **Band of Agents Hackathon** (lablab.ai, Jun 12 to 19 2026; [results](https://lablab.ai/ai-hackathons/band-of-agents-hackathon/live)). 1st place: Freight Room (7 mixed-framework agents vote on ship-delay recovery, human approves, audit dossier; [repo](https://github.com/rohan879/freight-room)). 2nd: Recoverflow ("Cross-border AR on autopilot"). 3rd: ClaimArbiter (insurance claims, human signs the decision, tamper-evident trail; [repo](https://github.com/sahil-sharma-50/ClaimArbiter)). VERIFIED. Band's own demos cover legal negotiation, a support orchestrator and bank KYC.
- **WeMakeDevs x Cognee** (Jun 29 to Jul 5 2026; [projects](https://archive.wemakedevs.org/hackathons/cognee/projects)). Lethe won Open Source: incident triage with "verifiable forgetting" and a Certificate of Erasure ([repo](https://github.com/vinayaksonthalia/lethe)). Classroom Memory won Cloud. RealtyRecall won Best Blog. VERIFIED.
- **Cognee's own events** (topoteretes/cognee-hackathons): Agent LLM Wiki (May 16), Company Brain with Slack + Granola (Jun 16, Jun 19), GTM Brain (Jun 26), Company Brain at SF Tech Week (Oct 7). No winners listed. VERIFIED.
- **This event:** no earlier "SF Startup Challenge" edition found. Closest listings: "AI Startup Challenge Hackathon" by Devnovate at AWS Builder Loft today ([luma.com/0oww46mm](https://luma.com/0oww46mm)) and the "Bay Builders Hackathon" naming BAND and Cognee ([luma.com/9zhqvqc7](https://luma.com/9zhqvqc7)). REPORTED; the Luma fetch returned HTTP 400.
- **Patterns to avoid or twist:** debate-and-vote room + human approval + audit trail (all three Band winners); "company brain" or "LLM wiki" (Cognee's most-run theme, and our Track 8). **What won instead:** a contrarian memory thesis (forgetting) and a clear domain purpose. Band rooms with Cognee as shared memory persisting across rooms and sessions: NOT FOUND in any project above (searched lablab results, WeMakeDevs archive, cognee-hackathons repo, `gh search repos` for cognee hackathon / thenvoi / band.ai).

## What this means / what to do
1. Pitch it as **"Prism for Founders: one memory, no contradictions"**, not as a wiki. Lead with the Acme contradiction beat.
2. Agent team (mixed harnesses): Claude Code architect (plan + board); LangGraph investor-update agent and CS/billing agent via band-sdk (Cognee + Flexprice); Codex security reviewer with Snyk (gives native `/approve`). Prism's 7 extractors become one "intake" agent's tools, which keeps the agent count manageable.
3. De-risk in the first 30 minutes: Band task board gating, Cognee remember+recall latency, Flexprice key.
4. Show `forget` ("off the record") and `improve` on screen; use Neo4j Browser as the wiki and graph view.

## Not checked
- docs.cognee.ai (source code read instead); Cognee latency on this Mac.
- `jam --help` (not installed); whether the task board is enabled on Vidyut's Band account.
- Flexprice cloud free tier and meter schema; `snyk code test` page directly.
- Live smoke calls to any sponsor API (no keys yet; they need Vidyut's OK).
- The hacker portal (per instruction, challenge.md is the source of truth).
- Fireflies, Decagon and Sierra prices (vendor pages publish none).

---
CHECKED_AT: Tue Oct 20 10:53:38 PDT 2026 (spot checks); research fetches 10:50 to 10:53 PDT
SUBJECT: plan/challenge.md + public web (no repo; folder is not a git repo)
CHECKED: PyPI JSON for cognee (1.6.5), band-sdk (6.0.1), flexprice (2.1.40) by me; docs.band.ai/llms.txt HTTP 200 by me; cognee v1.6.5 `__init__.py` (remember/recall/improve/forget, memify deprecated) by me; saved Band doc copies grep for "/approve <token>" and "gated on the platform" by me; all other URLs above read by six research subagents in this run
NOT CHECKED: see "Not checked" list
UNRESOLVED: Band SDK task board availability on our account (settle: call band_list_tasks once; CLI `band work board` is the fallback); whether Band Desktop prices band-sdk agents' tokens in USD (settle: run one SDK agent turn, check `band usage`); Snyk's own severity for diskcache and any Snyk-only findings (settle: one `snyk test` on the committed lockfile); Flexprice cloud free tier and exact event JSON names (settle: sponsor table, swagger file); Cognee recall latency (settle: one timed call); pricing labels monthly vs annual on Attio, Fathom, Read.ai (settle: open pages in a browser)
