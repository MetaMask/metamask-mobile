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
#       { "type": "mnemonic", "value": "word1 word2 ...", "name": "Primary" },
#       { "type": "privateKey", "value": "0xabc...", "name": "Trading" },
#       { "type": "privateKey", "value": "0xdef...", "name": "MYXTrading" }
#     ],
#     "settings": { "metametrics": true, "skipGtmModals": true, "skipPerpsTutorial": true, "autoLockNever": true, "deviceAuthEnabled": true }
#   }

set -euo pipefail

# Resolve the script directory to an absolute path BEFORE cd, so sourcing and
# helper paths work regardless of the caller's CWD (e.g. ./setup-wallet.sh).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../../.."
# Source .js.env but only for vars not already set, so caller env takes precedence.
# shellcheck source=lib/safe-env-parser.sh
. "$SCRIPT_DIR/lib/safe-env-parser.sh"
load_js_env

PORT="${WATCHER_PORT:-8081}"
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "ERROR: WATCHER_PORT must be numeric (got: $PORT)" >&2; exit 1; }
SCRIPTS="$SCRIPT_DIR"
export CDP_TIMEOUT="${CDP_TIMEOUT:-30000}"
export CDP_DISCOVERY_RETRIES="${CDP_DISCOVERY_RETRIES:-3}"
CDP="node $SCRIPTS/cdp-bridge.js"
FIXTURE_PATH=""

cdp_eval() { $CDP eval "$1" 2>/dev/null | jq -r '.'; }
cdp_eval_async() { $CDP eval-async "$1" 2>/dev/null | jq -r '.'; }

# -- Parse args --
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fixture)
      [ $# -ge 2 ] || { echo "ERROR: --fixture requires a path argument"; exit 2; }
      FIXTURE_PATH="$2"; shift 2 ;;
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
# Expected EVM account total = sum of mnemonic counts + one per private key.
# A mnemonic entry with count=N materializes N HD accounts, not one, so the
# entry count alone (ACCOUNT_COUNT) under-counts and would let setup pass while
# silently missing HD accounts.
EXPECTED_ETH_TOTAL=$(jq -r '[.accounts[] | if .type == "mnemonic" then (.count // .numberOfAccounts // 1) else 1 end] | add // 0' "$FIXTURE_PATH")
echo "Fixture OK: password + ${ACCOUNT_COUNT} entry(ies), ${EXPECTED_ETH_TOTAL} expected EVM account(s)"

# -- Check CDP --
$CDP eval "JSON.stringify({ok:true})" >/dev/null 2>&1 || { echo "ERROR: CDP not reachable"; exit 1; }
echo "CDP bridge connected."

# -- Wait for Engine to be ready (KeyringController must exist) --
ENGINE_WAIT=0
ENGINE_MAX=30
while [ $ENGINE_WAIT -lt $ENGINE_MAX ]; do
  ENGINE_OK=$(cdp_eval "(function(){ return Engine && Engine.context && Engine.context.KeyringController ? 'ready' : 'waiting'; })()" 2>/dev/null || echo "")
  [ "$ENGINE_OK" = "ready" ] && break
  sleep 1
  ENGINE_WAIT=$((ENGINE_WAIT + 1))
  [ $ENGINE_WAIT -eq 5 ] && echo "Waiting for Engine to initialize..."
done
if [ "$ENGINE_OK" != "ready" ]; then
  echo "ERROR: Engine.context.KeyringController not available after ${ENGINE_MAX}s"
  exit 1
fi

# The backup subscriber reads the Engine *class* static
# `disableAutomaticVaultBackup`. AgenticService.setupWallet/applyWalletFixture
# set that static authoritatively before any account import/rename. The
# CDP-exposed `Engine` is the facade object, not the class, so we cannot set the
# static from here — only record harness intent for observability.
if ! DISABLE_BACKUP=$(cdp_eval "(function(){ globalThis.__AGENTIC_DISABLE_VAULT_BACKUP = true; return JSON.stringify({agenticDisableVaultBackup: globalThis.__AGENTIC_DISABLE_VAULT_BACKUP === true}); })()"); then
  echo "WARN: could not record vault backup guard intent before wallet setup"
  DISABLE_BACKUP='{}'
fi
echo "Vault backup guard intent: $DISABLE_BACKUP"

# Read fixture JSON and escape it for safe embedding in a JS string literal.
FIXTURE_JSON=$(jq -c '.' "$FIXTURE_PATH")
ESCAPED_FIXTURE=$(node -p "JSON.stringify(JSON.stringify(JSON.parse(process.argv[1])))" "$FIXTURE_JSON")

# -- Check vault state --
VAULT_STATE=$(cdp_eval "(function(){ var v = Engine.context.KeyringController.state; return JSON.stringify({hasVault: v.vault !== undefined && v.vault !== null, isUnlocked: Engine.context.KeyringController.isUnlocked()}); })()")
HAS_VAULT=$(echo "$VAULT_STATE" | jq -r '.hasVault')
IS_UNLOCKED=$(echo "$VAULT_STATE" | jq -r '.isUnlocked')
echo "Vault state: hasVault=$HAS_VAULT, isUnlocked=$IS_UNLOCKED"

if [ "$HAS_VAULT" = "true" ]; then
  # Do NOT unlock here with a bare KeyringController.submitPassword(): that
  # bypasses the real auth flow (multichain init + dispatchLogin/password state)
  # and can leave Redux/auth state stale. applyWalletFixture unlocks via
  # Authentication.unlockWallet() when the vault is locked.
  if [ "$IS_UNLOCKED" = "true" ]; then
    echo "Vault already unlocked."
  else
    echo "Vault locked — applyWalletFixture will unlock via Authentication.unlockWallet() (real post-login flow)."
  fi

  echo "Applying fixture accounts/names to existing vault..."
  APPLY_RESULT=$(cdp_eval_async "(function(){ var fixture = JSON.parse($ESCAPED_FIXTURE); if (!globalThis.__AGENTIC__ || typeof globalThis.__AGENTIC__.applyWalletFixture !== 'function') { return JSON.stringify({ok:false, error:'__AGENTIC__.applyWalletFixture is not installed; reload the app from Metro'}); } return globalThis.__AGENTIC__.applyWalletFixture(fixture).then(function(r){ return JSON.stringify(r); }).catch(function(e){ return JSON.stringify({ok:false, error: e.message || String(e)}); }); })()")
  APPLY_OK=$(echo "$APPLY_RESULT" | jq -r '.ok')
  if [ "$APPLY_OK" != "true" ]; then
    APPLY_ERR=$(echo "$APPLY_RESULT" | jq -r '.error // "unknown error"')
    echo "ERROR: applyWalletFixture failed — $APPLY_ERR"
    exit 1
  fi
  echo "Wallet fixture apply result:"
  echo "$APPLY_RESULT" | jq -r '.accounts[]? | "  \(.name): \(.address)"'
else
  # -- Call AgenticService.setupWallet() on fresh app only --
  echo "Calling __AGENTIC__.setupWallet()..."

  SETUP_RESULT=$(cdp_eval_async "(function(){ var fixture = JSON.parse($ESCAPED_FIXTURE); if (!globalThis.__AGENTIC__ || typeof globalThis.__AGENTIC__.setupWallet !== 'function') { return JSON.stringify({ok:false, error:'__AGENTIC__.setupWallet is not installed'}); } return globalThis.__AGENTIC__.setupWallet(fixture).then(function(r){ return JSON.stringify(r); }).catch(function(e){ return JSON.stringify({ok:false, error: e.message || String(e)}); }); })()")

  SETUP_OK=$(echo "$SETUP_RESULT" | jq -r '.ok')
  if [ "$SETUP_OK" != "true" ]; then
    SETUP_ERR=$(echo "$SETUP_RESULT" | jq -r '.error // "unknown error"')
    SETUP_STEP=$(echo "$SETUP_RESULT" | jq -r '.step // "unknown-step"')
    echo "ERROR: setupWallet failed at ${SETUP_STEP} — $SETUP_ERR"
    exit 1
  fi

  echo "Wallet setup result:"
  echo "$SETUP_RESULT" | jq -r '.accounts[]? | "  \(.name): \(.address)"'
  sleep 2
fi

# -- Ask the app to leave auth/onboarding after unlock.
# HomeNav matches the product auth reset path, but some warm/onboarding states
# land on intermediate post-onboarding screens. Follow with WalletView so the
# harness proves the user-visible unlocked wallet, not just a populated vault.
$CDP navigate HomeNav >/dev/null 2>&1 || true
sleep 1
$CDP navigate WalletView >/dev/null 2>&1 || true
sleep 1

# -- Summary + hard validation --
ACCOUNTS=$(cdp_eval "(function(){ try { var ctx = Engine && Engine.context ? Engine.context : {}; var accountsController = ctx.AccountsController || {}; var keyringController = ctx.KeyringController || {}; var state = accountsController.state || {}; var internalAccounts = state.internalAccounts || {}; var accountsById = internalAccounts.accounts || {}; var accs = Object.values(accountsById); var eth = accs.filter(function(a){ return String(a && a.address || '').indexOf('0x') === 0; }); var route = globalThis.__AGENTIC__ && globalThis.__AGENTIC__.getRoute ? globalThis.__AGENTIC__.getRoute() : null; var selected = null; if (typeof accountsController.getSelectedAccount === 'function') { selected = accountsController.getSelectedAccount(); } else if (internalAccounts.selectedAccount && accountsById[internalAccounts.selectedAccount]) { selected = accountsById[internalAccounts.selectedAccount]; } return JSON.stringify({ok:true, unlocked: typeof keyringController.isUnlocked === 'function' ? keyringController.isUnlocked() : null, routeName: route && route.name, selected: selected ? {name: selected.metadata && selected.metadata.name, address: selected.address} : null, total: accs.length, ethAccounts: eth.length, accounts: eth.map(function(a){ return {name: a && a.metadata && a.metadata.name, address: a && a.address}; }), first3: eth.slice(0,3).map(function(a){ return {name: a && a.metadata && a.metadata.name, address: a && a.address}; })}); } catch (e) { return JSON.stringify({ok:false, error: e && (e.stack || e.message) || String(e)}); } })()")
ACCOUNTS_OK=$(echo "$ACCOUNTS" | jq -r '.ok // false')
if [ "$ACCOUNTS_OK" != "true" ]; then
  echo "ERROR: Unable to read wallet state after setupWallet"
  echo "$ACCOUNTS" | jq .
  exit 1
fi
TOTAL=$(echo "$ACCOUNTS" | jq -r '.total')
ETH_COUNT=$(echo "$ACCOUNTS" | jq -r '.ethAccounts')
UNLOCKED=$(echo "$ACCOUNTS" | jq -r '.unlocked')
ROUTE_NAME=$(echo "$ACCOUNTS" | jq -r '.routeName // empty')
EXPECTED_ADDRESSES=$(node - "$FIXTURE_PATH" <<'NODE'
const fs = require('fs');
const { Wallet } = require('ethers');
const fixture = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const addresses = [];
for (const account of fixture.accounts || []) {
  if (account.type === 'mnemonic') {
    const rawCount =
      account.count != null
        ? account.count
        : account.numberOfAccounts != null
        ? account.numberOfAccounts
        : 1;
    const count = Number(rawCount);
    for (let i = 0; i < count; i += 1) {
      addresses.push(
        Wallet.fromMnemonic(account.value, `m/44'/60'/0'/0/${i}`).address.toLowerCase(),
      );
    }
  } else if (account.type === 'privateKey') {
    const key = account.value.startsWith('0x') ? account.value : `0x${account.value}`;
    addresses.push(new Wallet(key).address.toLowerCase());
  }
}
console.log(JSON.stringify(addresses));
NODE
)
MISSING_ADDRESSES=$(ACCOUNTS_JSON="$ACCOUNTS" EXPECTED_JSON="$EXPECTED_ADDRESSES" node <<'NODE'
const accounts = JSON.parse(process.env.ACCOUNTS_JSON);
const expected = JSON.parse(process.env.EXPECTED_JSON);
const actual = new Set((accounts.accounts || accounts.first3 || []).map((a) => String(a.address || '').toLowerCase()));
const missing = expected.filter((address) => !actual.has(address));
console.log(JSON.stringify(missing));
NODE
)
if [ "$UNLOCKED" != "true" ]; then
  echo "ERROR: Wallet setup did not unlock the vault"
  echo "$ACCOUNTS" | jq .
  exit 1
fi
if [ "$ETH_COUNT" -lt "$EXPECTED_ETH_TOTAL" ]; then
  echo "ERROR: Wallet setup produced $ETH_COUNT ETH account(s), expected at least $EXPECTED_ETH_TOTAL from fixture"
  echo "$ACCOUNTS" | jq .
  exit 1
fi
if [ "$(echo "$MISSING_ADDRESSES" | jq 'length')" != "0" ]; then
  echo "ERROR: Wallet setup did not import/unlock the expected fixture account(s)"
  echo "Missing addresses:"
  echo "$MISSING_ADDRESSES" | jq -r '.[] | "  " + .'
  echo "Actual wallet state:"
  echo "$ACCOUNTS" | jq .
  exit 1
fi
case "$ROUTE_NAME" in
  Login|Onboarding|ExperienceEnhancer|FoxLoader|"")
    echo "ERROR: Wallet setup did not reach the unlocked wallet UI (route=${ROUTE_NAME:-empty})"
    echo "$ACCOUNTS" | jq .
    exit 1
    ;;
esac
echo ""
echo "=== Wallet Ready ==="
echo "Route: ${ROUTE_NAME:-unknown}"
echo "Unlocked: $UNLOCKED"
echo "Accounts: $ETH_COUNT ETH (${TOTAL} total)"
echo "$ACCOUNTS" | jq -r '.first3[] | "  \(.name): \(.address)"'
echo "Selected:"
echo "$ACCOUNTS" | jq -r '.selected | "  \(.name): \(.address)"'
echo ""
echo "Done."
exit 0
