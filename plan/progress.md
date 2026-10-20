# Progress: PrismKeep

Written by the main session after every checkpoint. One line per task, newest state wins.

## Tasks
- T1 to T11: not started

## Security scores (scorer and raw Snyk, every checkpoint)
- baseline (11:52, Snyk CLI 1.1308.1, local raw scans, scorer not run: Docker not installed):
  - Snyk Code (our code): 4 low, 0 medium/high, all python/PT on paths from env vars or CLI args (keep/api.py:78, keep/api.py:199, keep/store.py:27, keep/cli.py:82). Code-only score 9.6.
  - Snyk Open Source: `snyk test --all-projects` finds no supported files. Snyk does not read pyproject.toml + uv.lock, so the organizers' scorer will report "Dependency scan did not run" under Notes.
  - Same tree exported to requirements.txt and scanned outside the repo: 210 deps, 5 critical, 18 high, 7 medium, 2 low (more than 10 above low, so 0 if counted). Sources: pillow 12.3.0 (fix 13.0.0, blocked by fastembed <13), onnxruntime 1.23.2 (fix 1.24.1, blocked by cognee <=1.23.2 on py3.12), litellm 1.106.0 and diskcache 5.6.3 via cognee (no fix), langchain-community 0.4.2 via band-sdk[langgraph] (critical SSRF, no fix).
- after Cognee moved to a container (13:00, main at 54bff3b): Snyk Code 0 issues (the 4 path findings were fixed). Snyk Open Source on requirements.txt (Python 3.12): 61 deps, 1 low (langgraph 1.2.16, authorization bypass, no fix), 0 medium/high/critical. Formula score 9.9.
- organizers' scorer (13:15, app-security-score on the public GitHub URL, main at 54bff3b): **9.8/10**. First-party code H:0 M:0 L:2 (hashlib.md5 in keep/memory.py:77 and tests/test_cognee_backend.py:21, used only to rebuild Cognee's file name; fixed with usedforsecurity=False on build/security-billing, Snyk Code then 0). Dependencies: scorer note "Dependency scan did not run (requirements.txt: Missing required packages)": its snyk test runs outside the venv it installs into. Our own full dependency scan of the same tree: 1 low, so the honest total after the md5 fix is 9.9.
- cognee image (12:20, `snyk container test cognee/cognee:main`, floating tag; rescan the tag compose pins): Debian 12 OS packages only, 143 deps, 1 critical (zlib, no fix), 9 high (util-linux, zlib, expat, cyrus-sasl2: no fix; pcre2: fix 10.42-1+deb12u1), 7 medium, 208 low. Scanned separately; not part of the organizers' repo score.

## Rulings
- Ruling: one integrated product weaving tracks 6, 8 and 3, build split by layer (A Band spine, B memory, C trust/billing/video) | Vidyut's correction relayed by coordinator, 2026-10-20 | if judges want per-track depth, the weave still shows all three (by Vidyut)
- Ruling: Cognee 1.6.5 stays in our lockfile and runs in ONE keep-api process; every agent goes through the keep CLI | avoids cross-process store locks; research found 1 unfixable MODERATE advisory (diskcache), about 0.3 points | if Snyk flags more, upgrade or explain in docs/security.md (by master-planner, pending Vidyut)

## Gates
- idea lock: <Vidyut's words>
- storyboard: <Vidyut's words>
