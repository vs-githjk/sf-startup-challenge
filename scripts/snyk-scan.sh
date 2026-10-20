#!/usr/bin/env bash
# Scan a folder with Snyk Code (and Snyk Open Source if it has a manifest), loading SNYK_TOKEN from
# the repo's .env so agents don't need it in their own environment. The token is never printed.
#   scripts/snyk-scan.sh /path/to/lumen-app
# Exit codes follow Snyk: 0 clean, 1 findings, 2 or 3 error (never treat 2 or 3 as clean).
set -uo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:?usage: snyk-scan.sh <folder>}"
[ -d "$target" ] || { echo "not a folder: $target"; exit 2; }
if [ -z "${SNYK_TOKEN:-}" ] && [ -f "$root/.env" ]; then set -a; source "$root/.env"; set +a; fi
[ -n "${SNYK_TOKEN:-}" ] || { echo "SNYK_TOKEN not set in .env"; exit 2; }
export SNYK_TOKEN
snyk code test "$target"
