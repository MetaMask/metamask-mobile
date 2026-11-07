#!/bin/bash
# Correctness gate. The command comes from .auto/harness.json so the
# playground stays generic and the production test file stays intact.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

CMD=$(node --input-type=module -e '
import fs from "node:fs";
const cfg = JSON.parse(fs.readFileSync(".auto/harness.json", "utf8"));
process.stdout.write(cfg.checks_command || "");
')

if [ -z "$CMD" ]; then
  echo "checks_command is empty in .auto/harness.json" >&2
  exit 1
fi

bash -lc "$CMD" 2>&1 | tail -80
