## What this changes
<!-- one or two lines -->

## Role
- [ ] 1 Agents + Band (Vidyut)  - [ ] 2 Memory (Abhinav)  - [ ] 3 UI/UX (Deekshit)  - [ ] 4 Security + billing (Rishit)

## Checks (merge only when all are ticked)
- [ ] `uv run pytest -q` passes (CI is green)
- [ ] `scripts/security-score.sh --quick` shows no new high or critical finding
- [ ] No secrets, `.env` contents or `agent_config.yaml` in the diff
- [ ] No new dependency, or it is pinned with `==` and `uv.lock` is updated
- [ ] Didn't change the `keep` CLI/API contract, or Abhinav approved the change
- [ ] No Co-Authored-By trailers on the commits
