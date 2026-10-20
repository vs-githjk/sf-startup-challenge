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
| Small, pinned dependency tree | Python with `uv`, exact `==` pins, a committed `uv.lock` and `requirements.txt`; the web app (`web/`) uses 2 runtime npm packages (react, react-dom) pinned in a committed lockfile, scanned clean by Snyk |
| No injection | Parameterised SQL and Cypher only; no `shell=True`, `eval`, `exec` or `pickle` on untrusted data |
| Untrusted text stays inert | Transcripts and LLM output are rendered with `textContent`, never `innerHTML`; never passed to a shell or file path |
| Input validation | pydantic models with length limits and allowed values at every API edge |
| Secrets | Read from `.env` (gitignored) and `agent_config.yaml` (gitignored); never logged or posted in Band |
| Network | keep-api binds to 127.0.0.1 only; Neo4j and Cognee ports bound to localhost |

## Known findings

- **Cognee runs isolated as a container** (`cognee/cognee:1.6.5`, pinned tag, bound to 127.0.0.1, authentication and multi-tenancy off because it is a single local instance, local file paths and HTTP fetching disabled). Our repo's dependency tree (`requirements.txt`, 62 packages) no longer contains `cognee` or its heavy transitive packages (pillow, onnxruntime, litellm, diskcache), and no longer contains `langchain-community` (band-sdk is installed without its `langgraph` extra; we pin only `langgraph`, `langchain`, `langchain-core` and `langchain-anthropic`, the packages `agents/sdk/run.py` imports). Scan the image separately with Snyk Container: `snyk container test cognee/cognee:1.6.5`.
- Known risk in the container: `diskcache` (GHSA-w8v5-vhqr-4h9v, unsafe pickle deserialization, moderate, no fix released) lives inside the Cognee image. We never send untrusted pickles to it; its cache is internal to the container.
- Final scorer result: **9.8 out of 10** on the organizers' `app-security-score` (recorded in `plan/progress.md`).
