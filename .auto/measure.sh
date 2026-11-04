#!/bin/bash
# Hermes playground benchmark. Emits `METRIC name=value` lines.
# Exit 0 only when the workload self-check passes on every invocation.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

HERMES="${HERMES_BIN:-/Users/prithpalsooriya/Desktop/projects/metamask-mobile/ios/Pods/hermes-engine/destroot/bin/hermes}"
WORKLOAD=".auto/bench/workload.js"
if [ -f .auto/bench/bundle.js ]; then
  WORKLOAD=".auto/bench/bundle.js"
fi

node --input-type=module -e '
import fs from "node:fs";
const cfg = JSON.parse(fs.readFileSync(".auto/harness.json", "utf8"));
if (cfg.status !== "ready") {
  console.error("harness.json status is \"" + (cfg.status || "") + "\". Specialise workload.js, prompt.md, and checks_command, then set status to \"ready\".");
  process.exit(2);
}
if (!cfg.metric) {
  console.error("harness.json metric is empty");
  process.exit(2);
}
'

if [ ! -x "$HERMES" ]; then
  echo "Hermes binary is missing: $HERMES" >&2
  echo "Set HERMES_BIN to the MetaMask Mobile hermes CLI." >&2
  exit 1
fi

mkdir -p .auto/bench

# Reassemble workload.js from deps + original/candidate modules unless the
# workload is a static bundle.
if [ ! -f .auto/bench/bundle.js ]; then
  node .auto/bench/assemble-workload.mjs > /dev/null
fi

RUNS=3
for i in $(seq 1 $RUNS); do
  if ! "$HERMES" -O "$WORKLOAD" > ".auto/bench/run_$i.out" 2>&1; then
    echo "--- hermes crash (run $i) ---" >&2
    tail -20 ".auto/bench/run_$i.out" >&2
    echo "METRIC status=crash"
    exit 1
  fi
done

if ! grep -q '^SELF_CHECK=OK$' .auto/bench/run_*.out; then
  echo "--- parity self-check failed ---" >&2
  grep -h '^SELF_CHECK=' .auto/bench/run_*.out >&2 || tail -20 .auto/bench/run_1.out >&2
  exit 1
fi

node .auto/bench/median.mjs .auto/bench/run_1.out .auto/bench/run_2.out .auto/bench/run_3.out
