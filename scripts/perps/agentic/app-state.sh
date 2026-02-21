#!/bin/bash
# Query the running MetaMask app state via CDP bridge.
#
# Usage:
#   scripts/perps/agentic/app-state.sh route                    # Current route name
#   scripts/perps/agentic/app-state.sh state engine              # Redux state at path
#   scripts/perps/agentic/app-state.sh state engine.backgroundState.NetworkController
#   scripts/perps/agentic/app-state.sh eval "1+1"               # Arbitrary JS (sync)
#   scripts/perps/agentic/app-state.sh eval-async "fetch(...)"   # Arbitrary JS (async/Promise)
#   scripts/perps/agentic/app-state.sh nav                      # Full navigation state
#   scripts/perps/agentic/app-state.sh can-go-back              # Can navigate back?
#   scripts/perps/agentic/app-state.sh go-back                  # Navigate back

set -euo pipefail

cd "$(dirname "$0")/../../.."

COMMAND="${1:-route}"
shift || true

case "$COMMAND" in
  route)
    node scripts/perps/agentic/cdp-bridge.js get-route
    ;;
  state)
    node scripts/perps/agentic/cdp-bridge.js get-state "$@"
    ;;
  nav)
    node scripts/perps/agentic/cdp-bridge.js get-state
    ;;
  eval)
    node scripts/perps/agentic/cdp-bridge.js eval "$@"
    ;;
  eval-async)
    node scripts/perps/agentic/cdp-bridge.js eval-async "$@"
    ;;
  can-go-back)
    node scripts/perps/agentic/cdp-bridge.js can-go-back
    ;;
  go-back)
    node scripts/perps/agentic/cdp-bridge.js go-back
    ;;
  *)
    echo "Usage: app-state.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  route                  Current route name and params"
    echo "  state <dot.path>       Redux state at the given path"
    echo "  nav                    Full navigation state tree"
    echo "  eval <expression>      Evaluate arbitrary JS in app context (sync)"
    echo "  eval-async <expr>      Evaluate async/Promise expression"
    echo "  can-go-back            Check if navigation can go back"
    echo "  go-back                Navigate back"
    exit 1
    ;;
esac
