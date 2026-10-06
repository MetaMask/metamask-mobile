#!/usr/bin/env bash
# Emit one Playwright spec path per line for HyperExecute static discovery.
#
# Only emits specs that can match playwright.testmu.config.ts grep /@Performance\b/.
# Specs tagged only with area tags (for example @PerformanceSwaps) are excluded.
#
# Usage: BUILD_TYPE=onboarding|imported-wallet ./tests/scripts/hyperexecute-discover-performance-tests.sh
set -euo pipefail

BUILD_TYPE="${BUILD_TYPE:-}"
if [[ -z "$BUILD_TYPE" ]]; then
  echo "BUILD_TYPE is required (onboarding|imported-wallet)" >&2
  exit 1
fi

case "$BUILD_TYPE" in
  onboarding)
    ROOTS=(tests/performance/onboarding)
    ;;
  imported-wallet)
    ROOTS=(tests/performance/login)
    ;;
  *)
    echo "Unknown BUILD_TYPE: $BUILD_TYPE" >&2
    exit 1
    ;;
esac

# True when the file's describe title can include the bare @Performance type tag.
has_performance_type_tag() {
  local file="$1"
  grep -Eq \
    'test\.describe\(\s*Performance\s*,|\$\{Performance\}|@Performance([^A-Za-z]|$)' \
    "$file"
}

found=0
while IFS= read -r -d '' file; do
  if has_performance_type_tag "$file"; then
    printf '%s\n' "$file"
    found=$((found + 1))
  fi
done < <(find "${ROOTS[@]}" -type f -name '*.spec.ts' -print0 | LC_ALL=C sort -z)

if [[ "$found" -eq 0 ]]; then
  echo "No @Performance specs found under ${ROOTS[*]} for BUILD_TYPE=$BUILD_TYPE" >&2
  exit 1
fi
