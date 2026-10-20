#!/usr/bin/env bash
# Put lumen-app back to its deliberately vulnerable state before a demo run.
# Keeps the Fixer's earlier work on its own branch; only switches the checkout back to main.
set -euo pipefail
app="${1:-$HOME/lumen-app}"
git -C "$app" checkout -q main
git -C "$app" reset -q --hard origin/main
git -C "$app" clean -qfd -e '*.db'
echo "lumen-app reset to the vulnerable main ($(git -C "$app" log -1 --format=%h))"
