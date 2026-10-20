# Team setup (do this first, ~15 min)

Everyone on the team runs through this once. Ask in the team chat if a step fails; don't lose more than 10 minutes on it alone.

## 1. Clone and bootstrap

```sh
git clone https://github.com/vs-githjk/sf-startup-challenge.git
cd sf-startup-challenge
scripts/setup.sh          # checks tools, installs Snyk CLI, uv sync, creates .env
```

Prerequisites: `git`, Node ≥ 20, [`uv`](https://docs.astral.sh/uv/), Docker Desktop (running).

## 2. Band Desktop (mandatory sponsor)

1. Download Band Desktop: Mac Apple Silicon https://downloads.band.ai/desktop/latest/macos/jam-aarch64.dmg (Intel: .../macos/jam-x86_64.dmg). The bare downloads.band.ai address shows "Access Denied". Sign in with your app.band.ai account.
2. In the app, use **Install CLI** so `band` / `jam` are on your PATH.
   - Fallback if the app is not working: download the release tarball from github.com/thenvoi/homebrew-tap/releases, check its sha256 against `Formula/jam.rb`, then copy `band` and `jamd` into `~/.local/bin` (that is how Vidyut's machine was set up). Do not pipe the installer script into `sh` without reading it first.
   - `brew install thenvoi/tap/jam` fails if your Xcode is out of date. Use the fallback above instead.
3. `band init` (browser sign-in), then `band preflight`. Every row should be green.
4. Claude Code integration: `jam plugin install`, then restart your Claude Code sessions.
5. Join the team room (Vidyut shares the link), or pair two agents with `band connect request` / `band connect accept`.

Useful commands: `band ask` (ask the human a question in the room), `band usage` (tokens and $ per agent), `band brief` (restore a peer's context), `band doctor`.

Docs: docs.band.ai/jam

## 3. Cognee (mandatory sponsor, AI memory)

Cognee does not run inside our Python environment. It runs as the pinned container `cognee/cognee:1.6.5` (REST API on 127.0.0.1:8000) next to Neo4j, so its dependency tree stays out of this repo's Snyk scan. Set `NEO4J_PASSWORD` and `LLM_API_KEY` in `.env`, then:

```sh
docker compose up -d neo4j cognee
curl -s http://127.0.0.1:8000/health
KEEP_BACKEND=cognee uv run python -m keep.api
```

`KEEP_BACKEND=local` skips Cognee entirely (keyword recall, no LLM key). `COGNEE_URL` overrides the Cognee address. `uv run python scripts/reset_memory.py` empties Cognee and the ledger.

Docs: docs.cognee.ai · github.com/topoteretes/cognee

## 4. Snyk (bonus, but the organizers stress it)

1. Create a free account at snyk.io.
2. Create a **Personal Access Token**: Account settings → Personal Access Tokens. Put it in `.env` as `SNYK_TOKEN`.
3. Run `scripts/security-score.sh` to get the same 0–10 score the organizers' scorer gives. Add `--quick` to skip Docker.

How the score works: `10 − (critical×3 + high×1 + medium×0.3 + low×0.1)`. **More than 10 findings above "low" scores 0.** See [AGENTS.md](AGENTS.md) for the rules that keep the score high.

## 5. Flexprice (bonus, billing)

Sign up at docs.flexprice.io (cloud). Create an API key and put it in `.env` as `FLEXPRICE_API_KEY`. The plan defines which meters we create.

## Plan

The idea, PRD, hour-by-hour split and demo script are in [`plan/`](plan/).

`requirements.txt` is generated for Snyk (it reads that file, not `uv.lock`). Regenerate it whenever dependencies change: `uv export --format requirements-txt --no-hashes --no-dev --no-emit-project > requirements.txt`
