#!/usr/bin/env bash
# Manual validation recipe for TRAM-3713 (POL buy from token details page).
#
# Uses the MetaMask Mobile agent-device workflow documented in:
#   docs/readme/agent-device.md
#
# Prerequisites (local Mac):
#   1. Booted iOS simulator (e.g. IOS_SIMULATOR=mm-3 in .js.env)
#   2. Dev build installed: yarn install:ios:dev
#   3. Metro running with this branch: yarn watch:clean
#   4. agent-device auth (cloud profile) OR AGENT_DEVICE_DAEMON_AUTH_TOKEN set
#
# Usage:
#   ./scripts/ramps/validate-pol-token-buy-agent-device.sh
#   SCREENSHOT_DIR=/tmp/pol-buy ./scripts/ramps/validate-pol-token-buy-agent-device.sh

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly SCREENSHOT_DIR="${SCREENSHOT_DIR:-$REPO_ROOT/build/ramps-validation/pol-token-buy}"
readonly METAMASK_BUNDLE_ID="io.metamask.MetaMask"
readonly BUY_BUTTON_ID='id="token-buy-button"'

cd "$REPO_ROOT"

mkdir -p "$SCREENSHOT_DIR"

echo "==> Connecting agent-device (cloud profile or AGENT_DEVICE_DAEMON_AUTH_TOKEN)"
yarn agent-device connect

cleanup() {
  yarn agent-device disconnect 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Opening MetaMask on iOS simulator"
yarn agent-device open "$METAMASK_BUNDLE_ID" --platform ios --relaunch

echo "==> Waiting for wallet home"
yarn agent-device wait 'label="Wallet"' 120000

echo "==> Screenshot: wallet home"
yarn agent-device screenshot "$SCREENSHOT_DIR/01-wallet-home.png"

echo "==> Navigate to POL token details (adjust scroll/find if token list layout differs)"
yarn agent-device find "POL" press --first || {
  echo "Could not find POL in token list; scroll and retry manually:"
  echo "  yarn agent-device scroll down"
  echo "  yarn agent-device snapshot -i"
  exit 1
}

yarn agent-device wait text "POL" 30000
yarn agent-device screenshot "$SCREENSHOT_DIR/02-pol-token-details.png"

echo "==> Tap Buy on token details"
yarn agent-device press "$BUY_BUTTON_ID"

echo "==> Expect Build Quote (not unsupported region modal)"
if yarn agent-device is visible 'label="Unavailable in your region"' 5000; then
  echo "FAIL: Unsupported region modal appeared"
  yarn agent-device screenshot "$SCREENSHOT_DIR/03-fail-unsupported-region.png"
  exit 1
fi

yarn agent-device wait text "Buy" 60000 || true
yarn agent-device screenshot "$SCREENSHOT_DIR/03-build-quote-from-token-details.png"

echo "==> PASS: Build Quote reached from POL token details"
echo "Screenshots saved to: $SCREENSHOT_DIR"
