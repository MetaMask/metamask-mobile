#!/usr/bin/env bash
# One-shot: install dashboard deps if needed, then start HTTP + WebSocket server.
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -d node_modules/ws ]]; then
  npm ci
fi
exec node server.mjs
