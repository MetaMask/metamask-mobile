#!/usr/bin/env bash
# Emit one Playwright test file path per line for HyperExecute autosplit discovery.
#
# Only emits specs that can match playwright.testmu.config.ts grep /@Performance\b/.
# Specs tagged only with @System and/or area tags (e.g. @PerformanceSwaps) are excluded
# so HyperExecute does not schedule empty / false-green tasks.
#
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
    ROOTS=(tests/performance/onboarding)
    ;;
  imported-wallet)
    ROOTS=(tests/performance/login)
    ;;
  mm-connect)
    ROOTS=(tests/performance/mm-connect)
    ;;
  *)
    echo "Unknown BUILD_TYPE: $BUILD_TYPE" >&2
    exit 1
    ;;
esac

# True when the file's describe title can include the bare @Performance type tag.
# Mirrors tests/playwright.testmu.config.ts: grep: /@Performance\b/
# (area tags like @PerformanceOnboarding alone do NOT match that grep).
has_performance_type_tag() {
  local file="$1"
  # describe(Performance, ...)  — mm-connect style
  # ${Performance} in template  — `${Performance} ${System} ...`
  # literal @Performance with word boundary (not @PerformanceLogin etc.)
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
  echo "❌ No @Performance specs found under ${ROOTS[*]} for BUILD_TYPE=$BUILD_TYPE" >&2
  exit 1
fi
