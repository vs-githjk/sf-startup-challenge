#!/usr/bin/env bash
# Start real memory on the Band host: Neo4j + Cognee containers, then keep-api on the Cognee backend,
# then a remember / recall / forget round trip. Reads keys from .env; never prints them.
#   scripts/start-memory.sh            # start everything and smoke-test
#   scripts/start-memory.sh --local    # fall back to the offline backend (no LLM key needed)
set -euo pipefail
cd "$(dirname "$0")/.."

need() { grep -Eq "^$1=.+" .env || { echo "missing $1 in .env"; exit 1; }; }
[ -f .env ] || { echo "no .env (copy .env.example)"; exit 1; }

pkill -f "python -m keep.api" 2>/dev/null || true
sleep 1

if [ "${1:-}" = "--local" ]; then
  KEEP_BACKEND=local nohup uv run --env-file .env python -m keep.api > .keep-api.log 2>&1 &
  sleep 6; curl -fsS http://127.0.0.1:8787/health; echo; exit 0
fi

need LLM_API_KEY; need NEO4J_PASSWORD
docker info >/dev/null 2>&1 || { echo "Docker is not running"; exit 1; }

echo "== starting neo4j + cognee"
docker compose --env-file .env up -d neo4j cognee
for i in $(seq 1 60); do
  curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS http://127.0.0.1:8000/health >/dev/null || { echo "cognee not healthy; see: docker compose logs cognee"; exit 1; }
echo "cognee healthy"

echo "== starting keep-api on Cognee"
KEEP_BACKEND=cognee KEEP_WARMUP=1 nohup uv run --env-file .env python -m keep.api > .keep-api.log 2>&1 &
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:8787/health >/dev/null 2>&1 && break; sleep 2; done
curl -fsS http://127.0.0.1:8787/health; echo

echo "== round trip (remember, recall, forget)"
t0=$(date +%s)
id=$(bin/keep remember --dataset company --kind decision --text "Start-memory smoke test fact $(date +%H%M%S)" | python3 -c "import sys,json; print(json.load(sys.stdin)['data_id'])")
t1=$(date +%s)
bin/keep recall --dataset company --query "start-memory smoke test fact" | head -12
t2=$(date +%s)
bin/keep forget --data-id "$id" >/dev/null
echo "remember $((t1-t0))s, recall $((t2-t1))s, forget ok. Memory is live."
