# Security

PrismKeep's agents send messages to investors and customers, so trust is the product. Security is part of how the team ships, not a step at the end.

## Security inside the product

- **A Security Reviewer agent in the Band room.** It runs Snyk Code and Snyk Open Source on every customer fix. It blocks the work item until a rescan is clean, and stores each finding in Cognee (`eng_security`) with a count, so the Fixer recalls past mistakes before it writes code.
- **Founder approval with a hash.** Nothing is sent without the founder's approval in Band. The outbox refuses to send unless the SHA-256 of the body matches the approved text.
- **Memory hygiene.** The founder can make the agents forget a fact (Cognee `forget`), and forgotten items never come back in recall.
- **Synthetic data only** in this prototype. The outbox writes `.eml` files for a test inbox.

## Our own repository

The organizers score repos with [app-security-score](https://github.com/javiergarza-snyk/app-security-score) (`snyk test --all-projects` + `snyk code test`). We run the same scorer with `scripts/security-score.sh` at every checkpoint and record the result in `plan/progress.md`.

| Practice | How |
|---|---|
| Small, pinned dependency tree | Python only, `uv` with exact `==` pins and a committed `uv.lock`; no npm in the repo; the UI is plain HTML, CSS and JS with no build step |
| No injection | Parameterised SQL and Cypher only; no `shell=True`, `eval`, `exec` or `pickle` on untrusted data |
| Untrusted text stays inert | Transcripts and LLM output are rendered with `textContent`, never `innerHTML`; never passed to a shell or file path |
| Input validation | pydantic models with length limits and allowed values at every API edge |
| Secrets | Read from `.env` (gitignored) and `agent_config.yaml` (gitignored); never logged or posted in Band |
| Network | keep-api binds to 127.0.0.1 only; Neo4j ports bound to localhost |

## Known findings

- `diskcache 5.6.3` (pulled in by `cognee==1.6.5`): GHSA-w8v5-vhqr-4h9v, unsafe pickle deserialization, moderate. **No fixed version exists.** We never pass untrusted data to diskcache, and its cache directory is local to the memory service. We'll upgrade as soon as a fix ships.
- Final scorer result: _filled in at feature freeze from the real run._
