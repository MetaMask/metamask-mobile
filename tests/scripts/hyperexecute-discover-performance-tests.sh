#!/usr/bin/env bash
# Emit one Playwright test file path per line for HyperExecute autosplit discovery.
# Usage: BUILD_TYPE=onboarding|imported-wallet|mm-connect ./tests/scripts/hyperexecute-discover-performance-tests.sh
set -euo pipefail

BUILD_TYPE="${BUILD_TYPE:-}"
if [[ -z "$BUILD_TYPE" ]]; then
  echo "BUILD_TYPE is required (onboarding|imported-wallet|mm-connect)" >&2
  exit 1
fi

case "$BUILD_TYPE" in
  onboarding)
    # Includes seedless specs; project selection happens in the runner script.
    find tests/performance/onboarding -type f -name '*.spec.ts' | LC_ALL=C sort
    ;;
  imported-wallet)
    find tests/performance/login -type f -name '*.spec.ts' | LC_ALL=C sort
    ;;
  mm-connect)
    find tests/performance/mm-connect -type f -name '*.spec.ts' | LC_ALL=C sort
    ;;
  *)
    echo "Unknown BUILD_TYPE: $BUILD_TYPE" >&2
    exit 1
    ;;
esac
