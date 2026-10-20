# How we work (4 people, one repo)

| Person | Role | Branch |
|---|---|---|
| Vidyut | 1 Agents + Band | `build/agents-band` |
| Abhinav | 2 Memory + intelligence | `build/memory` |
| Deekshit | 3 UI/UX + **merges PRs** | `build/ui` |
| Rishit | 4 Security + billing | `build/security-billing` |

1. Work on your branch. Pull main often: `git pull --rebase origin main`.
2. Open small PRs into `main` early and often (every 30 to 45 minutes). Fill in the PR checklist.
3. **Deekshit reviews and merges.** Merge only when CI is green and the checklist is ticked. Rishit can block any PR that adds a high or critical Snyk finding.
4. Before the checkpoints (12:30 CP1, 13:15 CP2), everyone gets a PR in by :20 so Deekshit can merge by :30.
5. The `keep` CLI/API (plan/plan.md › Interfaces) is the contract between roles. Abhinav owns it; changes need his OK.
6. Commit as yourself. Never add Co-Authored-By or any attribution trailer.
