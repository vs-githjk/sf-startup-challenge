#!/usr/bin/env bash
# Score this repo 0-10 with the organizers' Snyk scorer
# (github.com/javiergarza-snyk/app-security-score): snyk test --all-projects + snyk code test,
# run inside throwaway Docker containers. Needs Docker running and SNYK_TOKEN (a PAT).
#
#   scripts/security-score.sh            # scan the local working copy
#   scripts/security-score.sh --quick    # skip Docker, just run the Snyk CLI here
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

if [ -z "${SNYK_TOKEN:-}" ] && [ -f .env ]; then
  set -a; source .env; set +a
fi
[ -n "${SNYK_TOKEN:-}" ] || { echo "SNYK_TOKEN not set (put a Snyk PAT in .env)"; exit 1; }

if [ "${1:-}" = "--quick" ]; then
  echo "== snyk test --all-projects (dependencies)"
  snyk test --all-projects --severity-threshold=low || true
  echo "== snyk code test (first-party code)"
  snyk code test || true
  exit 0
fi

SCORER="$ROOT/.app-security-score"
if [ ! -d "$SCORER" ]; then
  git clone --depth 1 https://github.com/javiergarza-snyk/app-security-score "$SCORER"
fi
docker info >/dev/null 2>&1 || { echo "Docker is not running"; exit 1; }
node "$SCORER/cli.mjs" "$ROOT"
