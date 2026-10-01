#!/usr/bin/env bash
#
# Cloud Agent install step for MetaMask Mobile (JS / Expo development).
#
# This prepares a JS-only development environment: JavaScript dependencies,
# the in-page bridge, Foundry/anvil, Terms of Use, and the git submodule.
# Native iOS/Android builds are intentionally skipped — a Linux Cloud Agent
# has no iOS simulator or Android emulator, so the supported flow here is the
# Expo/Metro JavaScript workflow (see docs/readme/expo-environment.md).
#
# Idempotent: safe to re-run. Node is pinned to the version in .nvmrc.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

NODE_VERSION="$(tr -d ' \t\n\r' < .nvmrc)"

# --- Node (via nvm) --------------------------------------------------------
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "==> Installing nvm"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

echo "==> Ensuring Node ${NODE_VERSION}"
nvm install "${NODE_VERSION}"
nvm alias default "${NODE_VERSION}" >/dev/null
nvm use "${NODE_VERSION}" >/dev/null
export PATH="$NVM_DIR/versions/node/v${NODE_VERSION}/bin:$PATH"
corepack enable >/dev/null 2>&1 || true
echo "    node $(node -v) / yarn $(corepack yarn -v)"

# --- Environment variable files -------------------------------------------
# scripts/setup.mjs copies these only in non-CI mode; copy them here so the
# app can be bundled/tested. Never overwrite an existing file.
for f in .js.env .ios.env .android.env .e2e.env; do
  if [ ! -f "$f" ] && [ -f "$f.example" ]; then
    cp "$f.example" "$f"
    echo "==> Created $f from example"
  fi
done

# --- JavaScript dependencies ----------------------------------------------
echo "==> yarn install"
corepack yarn install --immutable

# --- Project setup (JS only, no native builds) -----------------------------
# Handles: git submodule, in-page bridge, LavaMoat allow-scripts,
# patch-package, Foundry/anvil, Terms of Use. CI=1 keeps output non-interactive.
echo "==> Project setup (setup.mjs, JS only)"
CI=1 node scripts/setup.mjs --no-build-ios --no-build-android

echo "==> Install complete"
