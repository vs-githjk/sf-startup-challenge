# Rules for every agent and human working in this repo

The plan lives in `plan/`. Read `plan/challenge.md` for the rubric before starting a work item.

## Security (the organizers score this with Snyk)

Our repo is scored 0–10 by `snyk test --all-projects` (dependencies) and `snyk code test` (our code). More than 10 findings above "low" scores **0**. Rules:

1. **No new dependency without a reason.** Before adding one, check that the standard library or an existing dependency can't do the job. Pin exact versions (`==` in Python, an exact version in package.json) and commit the lockfile (`uv.lock`, `package-lock.json`, or `bun.lock` plus a `package-lock.json`).
2. **No secrets in code.** Read keys from the environment (`.env` is gitignored). Never log them, and never echo them into the Band room.
3. **No `eval`, `exec`, `shell=True`, `pickle` on untrusted data, or string-built SQL.** Use parameterized queries and argument lists for subprocesses.
4. **Treat LLM and transcript text as untrusted input.** Escape it before rendering as HTML. Never pass it to a shell, a file path or a SQL string.
5. **Validate inputs at the API edge** (type, length, allowed values). Set request size limits.
6. **Before moving a work item that changes code in this repo to Done**, run `scripts/security-score.sh --quick`. Don't move it if it added any high or critical finding. The security-reviewer agent blocks the item until the finding is fixed. Tasks that change no code (memory lookups, drafts, messages) skip this check.
7. If Snyk flags a vulnerable dependency, upgrade to the fixed version it suggests. If no fix exists, remove the dependency.

## Workflow

- Small commits, one work item per branch where practical. Pull before you push.
- Write decisions, review findings and recurring security issues to Cognee memory so other agents (and tomorrow's sessions) recall them.
- Ask the human through Band (`band ask`) for real decisions: product choices, sending anything external, running destructive commands.
