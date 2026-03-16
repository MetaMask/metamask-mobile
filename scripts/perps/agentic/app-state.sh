#!/bin/bash
# Query the running MetaMask app state via CDP bridge.
#
# Usage:
#   scripts/perps/agentic/app-state.sh status                   # Route + selected account snapshot
#   scripts/perps/agentic/app-state.sh route                    # Current route name
#   scripts/perps/agentic/app-state.sh state engine              # Redux state at path
#   scripts/perps/agentic/app-state.sh state engine.backgroundState.NetworkController
#   scripts/perps/agentic/app-state.sh eval "1+1"               # Arbitrary JS (sync)
#   scripts/perps/agentic/app-state.sh eval-async "fetch(...)"   # Arbitrary JS (async/Promise)
#   scripts/perps/agentic/app-state.sh nav                      # Full navigation state
#   scripts/perps/agentic/app-state.sh can-go-back              # Can navigate back?
#   scripts/perps/agentic/app-state.sh go-back                  # Navigate back
#   scripts/perps/agentic/app-state.sh accounts                 # List all accounts
#   scripts/perps/agentic/app-state.sh account                  # Get selected account
#   scripts/perps/agentic/app-state.sh switch-account <addr>    # Switch account
#   scripts/perps/agentic/app-state.sh press <testId>           # Press component by testID
#   scripts/perps/agentic/app-state.sh scroll [--test-id <id>] [--offset <n>]  # Scroll
#   scripts/perps/agentic/app-state.sh recipe perps/positions   # Run a recipe
#   scripts/perps/agentic/app-state.sh recipe --list            # List recipes

set -euo pipefail

cd "$(dirname "$0")/../../.."

COMMAND="${1:-route}"
shift || true

case "$COMMAND" in
  status)
    node scripts/perps/agentic/cdp-bridge.js status
    ;;
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
  accounts)
    node scripts/perps/agentic/cdp-bridge.js list-accounts
    ;;
  account)
    node scripts/perps/agentic/cdp-bridge.js get-selected-account
    ;;
  switch-account)
    node scripts/perps/agentic/cdp-bridge.js switch-account "$@"
    ;;
  press)
    node scripts/perps/agentic/cdp-bridge.js press-test-id "$@"
    ;;
  scroll)
    node scripts/perps/agentic/cdp-bridge.js scroll-view "$@"
    ;;
  sentry-debug)
    node scripts/perps/agentic/cdp-bridge.js sentry-debug "$@"
    ;;
  unlock)
    node scripts/perps/agentic/cdp-bridge.js unlock "$@"
    ;;
  recipe)
    node scripts/perps/agentic/cdp-bridge.js recipe "$@"
    ;;
  *)
    echo "Usage: app-state.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  status                 Route + selected account snapshot"
    echo "  route                  Current route name and params"
    echo "  state <dot.path>       Redux state at the given path"
    echo "  nav                    Full navigation state tree"
    echo "  eval <expression>      Evaluate arbitrary JS in app context (sync)"
    echo "  eval-async <expr>      Evaluate async/Promise expression"
    echo "  can-go-back            Check if navigation can go back"
    echo "  go-back                Navigate back"
    echo "  accounts               List all accounts"
    echo "  account                Get the currently selected account"
    echo "  switch-account <addr>  Switch to account by address"
    echo "  press <testId>         Press a component by its testID prop"
    echo "  scroll [opts]          Scroll a ScrollView/FlatList"
    echo "                         --test-id <id>  --offset <n>  --animated"
    echo "  sentry-debug [enable|disable]  Patch Sentry to log errors to console"
    echo "  unlock <password>      Unlock wallet via fiber tree"
    echo "  recipe <team/name>     Run a recipe (e.g. perps/positions)"
    echo "  recipe --list          List all available recipes"
    exit 1
    ;;
esac
