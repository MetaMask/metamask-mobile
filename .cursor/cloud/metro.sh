#!/usr/bin/env bash
#
# Long-running Metro bundler (React Native dev server) for MetaMask Mobile.
# Serves JavaScript bundles on demand. Runs as a visible Cloud Agent terminal
# so its logs are inspectable and it can be restarted independently.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

NODE_VERSION="$(tr -d ' \t\n\r' < .nvmrc)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$NVM_DIR/versions/node/v${NODE_VERSION}/bin:$PATH"

# Defensive: ensure the mmap limit is raised even if `start` has not run yet,
# so Metro can bundle the full app on demand without a spurious V8 mmap OOM.
if [ "$(cat /proc/sys/vm/max_map_count 2>/dev/null || echo 0)" -lt 1048576 ]; then
  sudo sysctl -w vm.max_map_count=1048576 >/dev/null 2>&1 || true
fi

exec corepack yarn watch
