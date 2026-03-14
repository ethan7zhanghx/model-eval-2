#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <work_dir> <eval_json> <view_log> <skip_view_flag>"
  exit 1
fi

WORK_DIR="$1"
EVAL_JSON="$2"
VIEW_LOG="$3"
SKIP_VIEW="$4"

echo "[smoke-v1-assert] Checking init artifacts ..."
test -f "$WORK_DIR/promptfooconfig.yaml"
test -f "$WORK_DIR/README.md"

echo "[smoke-v1-assert] Checking eval output JSON ..."
test -f "$EVAL_JSON"

node -e '
const fs = require("node:fs");
const file = process.argv[1];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
if (!data.evalId) {
  throw new Error("Missing evalId");
}
if (!data.results || !data.results.stats) {
  throw new Error("Missing results.stats");
}
if ((data.results.stats.successes ?? 0) < 1) {
  throw new Error("Expected at least one successful case");
}
console.log("[smoke-v1-assert] eval JSON structure OK");
' "$EVAL_JSON"

if [[ "$SKIP_VIEW" == "1" ]]; then
  echo "[smoke-v1-assert] view checks skipped"
else
  echo "[smoke-v1-assert] Checking view startup log ..."
  test -f "$VIEW_LOG"
  if ! rg -q "Server running at" "$VIEW_LOG"; then
    echo "[smoke-v1-assert] ERROR: view log does not contain startup line"
    echo "--- view log ---"
    cat "$VIEW_LOG"
    exit 1
  fi
fi

echo "[smoke-v1-assert] PASS"
