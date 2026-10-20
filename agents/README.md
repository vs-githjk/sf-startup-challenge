# The agent team

Six agents built with three tools, in two Band rooms. Every agent reads and writes memory only through `bin/keep` (the keep-api service owns Cognee). See `plan/plan.md` › Interfaces.

| Agent | Built with | Room | Instructions | How to start it |
|---|---|---|---|---|
| Chief of Staff | Claude Code (attached) | HQ, Eng | `chief_of_staff/CLAUDE.md` | Open Claude Code in `agents/chief_of_staff/`, then `/jam as architect` |
| Drafter | Codex | HQ | `drafter/AGENTS.md` | Band Desktop › New agent › Codex, working dir `agents/drafter/` |
| Fixer | Codex | Eng | `fixer/AGENTS.md` | Band Desktop › New agent › Codex, working dir is the `lumen-app` checkout |
| Security Reviewer | Claude Code + Snyk | Eng, HQ | `security_reviewer/CLAUDE.md` | Claude Code in `agents/security_reviewer/`, then `/jam as security-reviewer` |
| Listener | LangGraph (Band SDK) | HQ | `prompts/listener.md` | `uv run --env-file .env python -m agents.sdk.run listener` |
| Brain | LangGraph (Band SDK) | HQ | `prompts/brain.md` | `uv run --env-file .env python -m agents.sdk.run brain` |

## Before starting any agent

1. Cognee and keep-api are running: `docker compose up -d neo4j cognee`, then `KEEP_BACKEND=cognee uv run python -m keep.api` (default http://127.0.0.1:8787; `KEEP_BACKEND=local` works offline, without LLM keys).
2. `bin/keep` is on the agent's PATH, or call it with its full path.
3. SDK agents: register each at app.band.ai/agents › Connect Agent and save the ID and key in `agent_config.yaml` at the repo root (gitignored):

```yaml
listener:
  agent_id: "..."
  api_key: "..."
brain:
  agent_id: "..."
  api_key: "..."
```

## House rules for every agent

- Cite memory in every message that uses it: `[memory: <dataset> / <short quote>]`.
- Board task titles start with `[CS]`, `[IR]`, `[KB]` or `[SEC]`. Only the Security Reviewer unblocks a task it blocked.
- Nothing leaves without the founder's approval through `band ask`.
- Never print keys, tokens or `.env` contents into a room.

## Band handles

Create each agent in Band Desktop (Agents › New agent) with these exact handles, so the @mentions in the instructions reach the right agent:
`chief-of-staff` (Claude Code, Hq + Eng), `drafter` (Codex, Hq), `fixer` (Codex, Eng, folder ~/lumen-app),
`security-reviewer` (Claude Code, Eng + Hq), `listener` and `brain` (Band SDK, Hq).
Working directory must be an absolute path, for example `/Users/<you>/SF Startup Challenge/agents/drafter`.
Permission mode: "Default" (asks through Band). `keep`, `band` and `snyk` are pre-approved in each folder's `.claude/settings.json`.
