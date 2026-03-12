#!/bin/bash
# Unlock the MetaMask wallet via CDP bridge.
#
# The Login screen exposes testIDs:
#   login-password-input  — password TextField (onChangeText)
#   log-in-button         — unlock Button (onPress)
#
# Usage:
#   scripts/perps/agentic/unlock-wallet.sh <password>
#   MM_PASSWORD=secret scripts/perps/agentic/unlock-wallet.sh
#
# The password is passed to the app via CDP eval — it is NOT echoed to stdout.
#
# Two-phase approach: inject password first, wait for React to re-render
# (so useCallback picks up the new password), then press the unlock button.

set -euo pipefail

cd "$(dirname "$0")/../../.."

PASSWORD="${1:-${MM_PASSWORD:-}}"

if [ -z "$PASSWORD" ]; then
  echo "Usage: unlock-wallet.sh <password>"
  echo "   or: MM_PASSWORD=<password> unlock-wallet.sh"
  echo ""
  echo "Unlocks the MetaMask wallet by injecting the password into the login"
  echo "screen's text field and pressing the unlock button via CDP."
  exit 1
fi

BRIDGE="node scripts/perps/agentic/cdp-bridge.js"

# 1. Check current route
echo "Checking current route..."
ROUTE=$($BRIDGE get-route 2>&1) || true
echo "Current route: $ROUTE"

# 2. Use the cdp-bridge unlock command (handles two-phase inject + press)
echo "Unlocking wallet..."
RESULT=$($BRIDGE unlock "$PASSWORD" 2>&1)
echo "Result: $RESULT"

# 3. Wait for unlock to complete
echo "Waiting for unlock to complete..."
sleep 4

# 4. Verify route changed
NEW_ROUTE=$($BRIDGE get-route 2>&1) || true
echo "Route after unlock: $NEW_ROUTE"

echo "Done."
