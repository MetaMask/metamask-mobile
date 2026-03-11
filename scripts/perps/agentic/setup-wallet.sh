#!/bin/bash
# Setup wallet from a JSON fixture via CDP (no UI interaction).
#
# Usage:
#   setup-wallet.sh [--fixture path/to/fixture.json] [--force]
#
# Fixture resolution (priority order):
#   1. --fixture <path>
#   2. $WALLET_FIXTURE env var
#   3. .agent/wallet-fixture.json (default)
#
# Fixture JSON format:
#   {
#     "password": "yourpassword",
#     "import": { "type": "mnemonic", "value": "word1 word2 ..." },
#     "settings": { "metametrics": false }
#   }
#
# Set import to null for a fresh wallet (no mnemonic).

set -euo pipefail

cd "$(dirname "$0")/../../.."

SCRIPTS="$(dirname "$0")"
CDP="node $SCRIPTS/cdp-bridge.js"
FORCE=false
FIXTURE_PATH=""

# CDP returns JSON-encoded strings (double-quoted). Unwrap with jq.
cdp_eval() { $CDP eval "$1" 2>&1 | jq -r '.'; }
cdp_eval_async() { $CDP eval-async "$1" 2>&1 | jq -r '.'; }

# ── Parse args ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fixture) FIXTURE_PATH="$2"; shift 2 ;;
    --force)   FORCE=true; shift ;;
    *)         echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Resolve fixture file ───────────────────────────────────
if [ -z "$FIXTURE_PATH" ]; then
  FIXTURE_PATH="${WALLET_FIXTURE:-.agent/wallet-fixture.json}"
fi

if [ ! -f "$FIXTURE_PATH" ]; then
  echo "ERROR: Fixture not found: $FIXTURE_PATH"
  echo ""
  echo "Create one at .agent/wallet-fixture.json:"
  echo '  {"password":"qwerasdf","import":{"type":"mnemonic","value":"your 12 words"},"settings":{"metametrics":false}}'
  exit 1
fi

echo "Reading fixture: $FIXTURE_PATH"

# ── Parse fixture JSON ─────────────────────────────────────
PASSWORD=$(jq -r '.password // empty' "$FIXTURE_PATH")
IMPORT_TYPE=$(jq -r '.import.type // empty' "$FIXTURE_PATH")
IMPORT_VALUE=$(jq -r '.import.value // empty' "$FIXTURE_PATH")
IMPORT_NULL=$(jq -r '.import // "null"' "$FIXTURE_PATH")
METAMETRICS=$(jq -r 'if .settings.metametrics == false then "false" elif .settings.metametrics == true then "true" else "unset" end' "$FIXTURE_PATH")

if [ -z "$PASSWORD" ]; then
  echo "ERROR: fixture missing 'password' field"
  exit 1
fi

# ── Check CDP is reachable ─────────────────────────────────
if ! $CDP eval "JSON.stringify({ok:true})" >/dev/null 2>&1; then
  echo "ERROR: CDP bridge not reachable. Is Metro running?"
  echo "  Start with: bash $SCRIPTS/start-metro.sh"
  exit 1
fi
echo "CDP bridge connected."

# ── Check current vault state ──────────────────────────────
VAULT_STATE=$(cdp_eval "(function(){ var v = Engine.context.KeyringController.state; return JSON.stringify({hasVault: v.vault !== undefined && v.vault !== null, isUnlocked: v.isUnlocked}); })()")

HAS_VAULT=$(echo "$VAULT_STATE" | jq -r '.hasVault')
IS_UNLOCKED=$(echo "$VAULT_STATE" | jq -r '.isUnlocked')

echo "Vault state: hasVault=$HAS_VAULT, isUnlocked=$IS_UNLOCKED"

# ── Handle existing vault ──────────────────────────────────
if [ "$HAS_VAULT" = "true" ]; then
  if [ "$FORCE" = "true" ]; then
    echo "Vault exists but --force specified, will overwrite."
  elif [ "$IS_UNLOCKED" = "true" ]; then
    echo "Vault exists and is unlocked. Skipping creation."
    echo "  Use --force to overwrite."
  else
    # Locked — try to unlock
    echo "Vault exists but locked. Attempting unlock..."
    UNLOCK_RESULT=$(cdp_eval_async "Engine.context.KeyringController.submitPassword('$(echo "$PASSWORD" | sed "s/'/\\\\'/g")').then(function(){ return JSON.stringify({ok:true, isUnlocked: Engine.context.KeyringController.state.isUnlocked}) }).catch(function(e){ return JSON.stringify({ok:false, error: e.message}) })") || true

    UNLOCK_OK=$(echo "$UNLOCK_RESULT" | jq -r '.ok')
    if [ "$UNLOCK_OK" = "true" ]; then
      echo "Wallet unlocked successfully."
    else
      UNLOCK_ERR=$(echo "$UNLOCK_RESULT" | jq -r '.error')
      echo "ERROR: Failed to unlock — $UNLOCK_ERR"
      echo "  Check password in fixture or use --force to recreate."
      exit 1
    fi
  fi
fi

# ── Create vault if needed ─────────────────────────────────
if [ "$HAS_VAULT" = "false" ] || [ "$FORCE" = "true" ]; then
  if [ "$IMPORT_TYPE" = "mnemonic" ] && [ -n "$IMPORT_VALUE" ]; then
    # Mask mnemonic for display
    MASKED=$(echo "$IMPORT_VALUE" | awk '{print $1, $2, $3, "..."}')
    echo "Creating vault with mnemonic ($MASKED)"

    ESCAPED_PW=$(echo "$PASSWORD" | sed "s/'/\\\\'/g")
    ESCAPED_MN=$(echo "$IMPORT_VALUE" | sed "s/'/\\\\'/g")

    CREATE_RESULT=$(cdp_eval_async "Engine.context.KeyringController.createNewVaultAndRestore('$ESCAPED_PW', '$ESCAPED_MN').then(function(){ return JSON.stringify({ok:true}) }).catch(function(e){ return JSON.stringify({ok:false, error: e.message}) })") || true

    CREATE_OK=$(echo "$CREATE_RESULT" | jq -r '.ok')
    if [ "$CREATE_OK" != "true" ]; then
      CREATE_ERR=$(echo "$CREATE_RESULT" | jq -r '.error')
      echo "ERROR: createNewVaultAndRestore failed — $CREATE_ERR"
      exit 1
    fi
    echo "Vault created with mnemonic."

  elif [ "$IMPORT_TYPE" = "privateKey" ] && [ -n "$IMPORT_VALUE" ]; then
    echo "Creating fresh vault + importing private key..."

    ESCAPED_PW=$(echo "$PASSWORD" | sed "s/'/\\\\'/g")
    CREATE_RESULT=$(cdp_eval_async "Engine.context.KeyringController.createNewVaultAndKeychain('$ESCAPED_PW').then(function(){ return JSON.stringify({ok:true}) }).catch(function(e){ return JSON.stringify({ok:false, error: e.message}) })") || true

    CREATE_OK=$(echo "$CREATE_RESULT" | jq -r '.ok')
    if [ "$CREATE_OK" != "true" ]; then
      CREATE_ERR=$(echo "$CREATE_RESULT" | jq -r '.error')
      echo "ERROR: createNewVaultAndKeychain failed — $CREATE_ERR"
      exit 1
    fi

    # Import private key
    ESCAPED_PK=$(echo "$IMPORT_VALUE" | sed "s/'/\\\\'/g")
    IMPORT_RESULT=$(cdp_eval_async "Engine.context.KeyringController.importAccountWithStrategy('privateKey', ['$ESCAPED_PK']).then(function(addr){ return JSON.stringify({ok:true, address: addr}) }).catch(function(e){ return JSON.stringify({ok:false, error: e.message}) })") || true

    IMPORT_OK=$(echo "$IMPORT_RESULT" | jq -r '.ok')
    if [ "$IMPORT_OK" != "true" ]; then
      IMPORT_ERR=$(echo "$IMPORT_RESULT" | jq -r '.error')
      echo "ERROR: importAccountWithStrategy failed — $IMPORT_ERR"
      exit 1
    fi
    IMPORTED_ADDR=$(echo "$IMPORT_RESULT" | jq -r '.address')
    echo "Vault created. Imported key → $IMPORTED_ADDR"

  elif [ "$IMPORT_NULL" = "null" ] || [ -z "$IMPORT_TYPE" ]; then
    echo "Creating fresh vault (no import)..."

    ESCAPED_PW=$(echo "$PASSWORD" | sed "s/'/\\\\'/g")
    CREATE_RESULT=$(cdp_eval_async "Engine.context.KeyringController.createNewVaultAndKeychain('$ESCAPED_PW').then(function(){ return JSON.stringify({ok:true}) }).catch(function(e){ return JSON.stringify({ok:false, error: e.message}) })") || true

    CREATE_OK=$(echo "$CREATE_RESULT" | jq -r '.ok')
    if [ "$CREATE_OK" != "true" ]; then
      CREATE_ERR=$(echo "$CREATE_RESULT" | jq -r '.error')
      echo "ERROR: createNewVaultAndKeychain failed — $CREATE_ERR"
      exit 1
    fi
    echo "Fresh vault created."

  else
    echo "ERROR: Unknown import type '$IMPORT_TYPE'. Supported: mnemonic, privateKey, or null."
    exit 1
  fi
fi

# ── Apply settings ─────────────────────────────────────────
if [ "$METAMETRICS" = "false" ]; then
  cdp_eval "(function(){ Engine.context.AnalyticsController.optOut(); return JSON.stringify({optedIn: Engine.context.AnalyticsController.state.optedIn}); })()" >/dev/null
  echo "MetaMetrics: disabled"
elif [ "$METAMETRICS" = "true" ]; then
  cdp_eval "(function(){ Engine.context.AnalyticsController.optIn(); return JSON.stringify({optedIn: Engine.context.AnalyticsController.state.optedIn}); })()" >/dev/null
  echo "MetaMetrics: enabled"
fi

# ── Get accounts summary ───────────────────────────────────
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
