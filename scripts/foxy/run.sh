#!/usr/bin/env bash
# One-shot: install deps if needed, then start the Foxy server.
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -d node_modules/ws ]]; then
  npm install --no-audit --no-fund
fi
exec node server.mjs
