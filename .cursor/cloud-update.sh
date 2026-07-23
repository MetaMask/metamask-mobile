#!/usr/bin/env bash
#
# Cursor Cloud dependency refresh for MetaMask Mobile.
#
# This mirrors the minimal dependency-refresh step that the Cursor Cloud agent
# runs on VM startup. It is safe to run by hand and is idempotent. It does NOT
# run automatically on VM boot and does NOT change any committed environment
# config, so it cannot affect other developers' Cloud environments.
#
# It intentionally omits the one-time, network-heavy setup performed by
# `yarn setup:expo` (git submodules, inpage bridge, Foundry/anvil, Terms of Use).
# Those artifacts are gitignored but persist in the workspace; if any are missing
# (e.g. a fresh checkout) run `yarn setup:expo` instead. See the
# "Cursor Cloud specific instructions" section in AGENTS.md for details.
set -euo pipefail

# MetaMask Mobile requires Node ^24.16.0 (see .nvmrc). Select it via nvm when
# available so this works even in a non-login shell where the pinned Node is not
# already first on PATH.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install >/dev/null # installs / selects the version pinned in .nvmrc
  corepack enable >/dev/null 2>&1 || true
fi

# `allow-scripts` (native builds) and `patch-package` must run after every
# install because `yarn install` can re-link node_modules.
yarn install
yarn allow-scripts
yarn patch-package
