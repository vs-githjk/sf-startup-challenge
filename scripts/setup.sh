#!/usr/bin/env bash
# One-shot setup for a teammate's machine (macOS, Apple Silicon or Intel).
# Safe to re-run. Does not touch secrets — fill .env yourself.
set -euo pipefail

cd "$(dirname "$0")/.."
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }

echo "== Checking prerequisites"
for t in git node uv docker; do
  if command -v "$t" >/dev/null; then ok "$t $($t --version 2>&1 | head -1)"; else warn "$t missing — see SETUP.md"; fi
done

echo "== Band CLI (jam / band)"
if command -v band >/dev/null || command -v jam >/dev/null; then
  ok "band CLI present"
else
  warn "band CLI missing. Preferred: install Band Desktop (downloads.band.ai) and use its 'Install CLI' action."
  warn "Fallback: verified tarball from github.com/thenvoi/homebrew-tap/releases (see SETUP.md)"
fi

echo "== Snyk CLI"
if command -v snyk >/dev/null; then ok "snyk $(snyk --version)"; else
  npm i -g snyk && ok "snyk installed via npm"
fi

echo "== Python env (uv)"
uv sync

echo "== .env"
if [ -f .env ]; then ok ".env exists"; else cp .env.example .env && warn "created .env from .env.example — fill in keys"; fi

echo
echo "Next: sign in to Band (open Band Desktop, or run 'band init'), then 'band preflight'."
echo "Then run 'scripts/security-score.sh' to see our Snyk score."
