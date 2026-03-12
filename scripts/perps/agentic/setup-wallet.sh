#!/bin/bash
# Setup wallet from a JSON fixture via CDP + AgenticService.setupWallet().
#
# Expects a FRESH app (no existing vault). For a clean environment, run:
#   preflight.sh --clean --wallet-setup
#
# Usage:
#   setup-wallet.sh [--fixture path/to/fixture.json]
#
# Fixture JSON format:
#   {
#     "password": "yourpassword",
#     "accounts": [
#       { "type": "mnemonic", "value": "word1 word2 ..." },
#       { "type": "privateKey", "value": "0xabc...", "name": "Trading" }
#     ],
#     "settings": { "metametrics": false, "skipGtmModals": true }
#   }

set -euo pipefail

cd "$(dirname "$0")/../../.."
# Source .js.env but only for vars not already set, so caller env takes precedence.
if [ -f .js.env ]; then
  while IFS= read -r _line || [ -n "$_line" ]; do
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _line="${_line#export }"
    _key="${_line%%=*}"
    _key="${_key//[[:space:]]/}"
    [[ -n "$_key" && -z "${!_key+x}" ]] && eval "export $_line" 2>/dev/null || true
  done < .js.env
  unset _line _key
fi

PORT="${WATCHER_PORT:-8081}"
SCRIPTS="$(dirname "$0")"
export CDP_TIMEOUT="${CDP_TIMEOUT:-30000}"
CDP="node $SCRIPTS/cdp-bridge.js"
FIXTURE_PATH=""

cdp_eval() { $CDP eval "$1" 2>/dev/null | jq -r '.'; }
cdp_eval_async() { $CDP eval-async "$1" 2>/dev/null | jq -r '.'; }

# -- Parse args --
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fixture) FIXTURE_PATH="$2"; shift 2 ;;
    -h|--help) echo "Usage: setup-wallet.sh [--fixture path.json]"; exit 0 ;;
    *)         echo "Unknown arg: $1"; exit 2 ;;
  esac
done

# -- Resolve + validate fixture --
[ -z "$FIXTURE_PATH" ] && FIXTURE_PATH="${WALLET_FIXTURE:-.agent/wallet-fixture.json}"

if [ ! -f "$FIXTURE_PATH" ]; then
  echo "ERROR: Fixture not found: $FIXTURE_PATH"
  echo "  cp scripts/perps/agentic/wallet-fixture.example.json .agent/wallet-fixture.json"
  exit 1
fi
echo "Reading fixture: $FIXTURE_PATH"

jq empty "$FIXTURE_PATH" 2>/dev/null || { echo "ERROR: Invalid JSON"; exit 1; }

PASSWORD=$(jq -r '.password // empty' "$FIXTURE_PATH")
[ -z "$PASSWORD" ] && { echo "ERROR: fixture missing 'password'"; exit 1; }

if jq -e '.import' "$FIXTURE_PATH" >/dev/null 2>&1 && ! jq -e '.accounts' "$FIXTURE_PATH" >/dev/null 2>&1; then
  echo "ERROR: Old format. Use 'accounts' array. See: scripts/perps/agentic/wallet-fixture.example.json"
  exit 1
fi

ACCOUNT_COUNT=$(jq -r '.accounts | length // 0' "$FIXTURE_PATH" 2>/dev/null || echo 0)
for i in $(seq 0 $((ACCOUNT_COUNT - 1))); do
  ACC_TYPE=$(jq -r ".accounts[$i].type // empty" "$FIXTURE_PATH")
  ACC_VALUE=$(jq -r ".accounts[$i].value // empty" "$FIXTURE_PATH")
  if [ -z "$ACC_TYPE" ] || { [ "$ACC_TYPE" != "mnemonic" ] && [ "$ACC_TYPE" != "privateKey" ]; }; then
    echo "ERROR: accounts[$i].type must be 'mnemonic' or 'privateKey' (got '${ACC_TYPE:-empty}')"
    echo "  See: scripts/perps/agentic/wallet-fixture.example.json"
    exit 1
  fi
  [ -z "$ACC_VALUE" ] && { echo "ERROR: accounts[$i].value is empty"; exit 1; }
done
echo "Fixture OK: password + ${ACCOUNT_COUNT} account(s)"

# -- Check CDP --
$CDP eval "JSON.stringify({ok:true})" >/dev/null 2>&1 || { echo "ERROR: CDP not reachable"; exit 1; }
echo "CDP bridge connected."

# -- Check vault state --
VAULT_STATE=$(cdp_eval "(function(){ var v = Engine.context.KeyringController.state; return JSON.stringify({hasVault: v.vault !== undefined && v.vault !== null, isUnlocked: v.isUnlocked}); })()")
HAS_VAULT=$(echo "$VAULT_STATE" | jq -r '.hasVault')
IS_UNLOCKED=$(echo "$VAULT_STATE" | jq -r '.isUnlocked')
echo "Vault state: hasVault=$HAS_VAULT, isUnlocked=$IS_UNLOCKED"

# -- Existing vault: just unlock and skip to summary --
if [ "$HAS_VAULT" = "true" ]; then
  if [ "$IS_UNLOCKED" != "true" ]; then
    echo "Unlocking existing vault..."
    bash "$SCRIPTS/unlock-wallet.sh" "$PASSWORD"
  else
    echo "Vault already unlocked."
  fi
else
  # -- Call AgenticService.setupWallet() --
  echo "Calling __AGENTIC__.setupWallet()..."

  # Read fixture JSON and escape it for safe embedding in a JS string literal
  FIXTURE_JSON=$(jq -c '.' "$FIXTURE_PATH")
  ESCAPED_FIXTURE=$(node -p "JSON.stringify(JSON.stringify(JSON.parse(process.argv[1])))" "$FIXTURE_JSON")

  SETUP_RESULT=$(cdp_eval_async "(function(){ var fixture = JSON.parse($ESCAPED_FIXTURE); return globalThis.__AGENTIC__.setupWallet(fixture).then(function(r){ return JSON.stringify(r); }).catch(function(e){ return JSON.stringify({ok:false, error: e.message || String(e)}); }); })()")

  SETUP_OK=$(echo "$SETUP_RESULT" | jq -r '.ok')
  if [ "$SETUP_OK" != "true" ]; then
    SETUP_ERR=$(echo "$SETUP_RESULT" | jq -r '.error // "unknown error"')
    echo "ERROR: setupWallet failed — $SETUP_ERR"
    exit 1
  fi

  echo "Wallet created. Accounts:"
  echo "$SETUP_RESULT" | jq -r '.accounts[]? | "  \(.name): \(.address)"'
  sleep 2
fi

# -- Summary --
ACCOUNTS=$(cdp_eval "(function(){ var accs = Object.values(Engine.context.AccountsController.state.internalAccounts.accounts); var eth = accs.filter(function(a){ return a.address.indexOf('0x') === 0; }); return JSON.stringify({total: accs.length, ethAccounts: eth.length, first3: eth.slice(0,3).map(function(a){ return {name: a.metadata.name, address: a.address}; })}); })()")
TOTAL=$(echo "$ACCOUNTS" | jq -r '.total')
ETH_COUNT=$(echo "$ACCOUNTS" | jq -r '.ethAccounts')
echo ""
echo "=== Wallet Ready ==="
echo "Accounts: $ETH_COUNT ETH (${TOTAL} total)"
echo "$ACCOUNTS" | jq -r '.first3[] | "  \(.name): \(.address)"'
echo ""
echo "Done."
exit 0
