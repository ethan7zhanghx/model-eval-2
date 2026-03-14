#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="${PROMPTFOO_SMOKE_WORK_DIR:-tmp/promptfoo-v1-smoke-${RUN_ID}}"
EVAL_JSON="${PROMPTFOO_SMOKE_EVAL_JSON:-/tmp/promptfoo-v1-eval-${RUN_ID}.json}"
VIEW_LOG="${PROMPTFOO_SMOKE_VIEW_LOG:-/tmp/promptfoo-v1-view-${RUN_ID}.log}"
VIEW_PORT="${PROMPTFOO_SMOKE_PORT:-15501}"
SKIP_VIEW="${PROMPTFOO_SMOKE_SKIP_VIEW:-0}"

export PROMPTFOO_CONFIG_DIR="${PROMPTFOO_CONFIG_DIR:-$ROOT_DIR/tmp/promptfoo-config}"
export PROMPTFOO_DISABLE_UPDATE="${PROMPTFOO_DISABLE_UPDATE:-true}"
export PROMPTFOO_DISABLE_TELEMETRY="${PROMPTFOO_DISABLE_TELEMETRY:-true}"

ENTRYPOINT="${ROOT_DIR}/dist/src/entrypoint.js"

echo "[smoke-v1] ROOT_DIR=${ROOT_DIR}"
echo "[smoke-v1] PROMPTFOO_CONFIG_DIR=${PROMPTFOO_CONFIG_DIR}"
echo "[smoke-v1] WORK_DIR=${WORK_DIR}"
echo "[smoke-v1] EVAL_JSON=${EVAL_JSON}"
echo "[smoke-v1] VIEW_LOG=${VIEW_LOG}"
echo "[smoke-v1] VIEW_PORT=${VIEW_PORT}"

mkdir -p "$PROMPTFOO_CONFIG_DIR" tmp

if [[ ! -f "$ENTRYPOINT" ]]; then
  echo "[smoke-v1] dist missing, running npm run build ..."
  npm run build
fi

# Fallback: if postbuild did not copy migrations/assets, populate minimal runtime assets.
if [[ ! -f "$ROOT_DIR/dist/drizzle/meta/_journal.json" ]]; then
  echo "[smoke-v1] drizzle artifacts missing in dist, copying fallback assets ..."
  rm -rf "$ROOT_DIR/dist/drizzle"
  cp -R "$ROOT_DIR/drizzle" "$ROOT_DIR/dist/drizzle"
fi

echo "[smoke-v1] Step 1/3: init"
node "$ENTRYPOINT" init "$WORK_DIR" --no-interactive

echo "[smoke-v1] Step 2/3: eval"
node "$ENTRYPOINT" eval -c test/smoke/fixtures/configs/basic.yaml -o "$EVAL_JSON" --no-progress-bar

if [[ "$SKIP_VIEW" == "1" ]]; then
  echo "[smoke-v1] Step 3/3: view (skipped by PROMPTFOO_SMOKE_SKIP_VIEW=1)"
else
  echo "[smoke-v1] Step 3/3: view"
  node "$ENTRYPOINT" view -p "$VIEW_PORT" -n >"$VIEW_LOG" 2>&1 &
  VIEW_PID=$!

  cleanup() {
    if [[ -n "${VIEW_PID:-}" ]] && kill -0 "$VIEW_PID" 2>/dev/null; then
      kill "$VIEW_PID" 2>/dev/null || true
      wait "$VIEW_PID" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT

  for i in $(seq 1 30); do
    if curl -sS "http://127.0.0.1:${VIEW_PORT}/health" >/dev/null 2>&1; then
      echo "[smoke-v1] view health check passed"
      break
    fi
    sleep 1
    if [[ "$i" -eq 30 ]]; then
      echo "[smoke-v1] ERROR: view health check timed out"
      exit 1
    fi
  done

  cleanup
  trap - EXIT
fi

"$ROOT_DIR/scripts/smoke-v1-assert.sh" "$WORK_DIR" "$EVAL_JSON" "$VIEW_LOG" "$SKIP_VIEW"

echo "[smoke-v1] PASS"
