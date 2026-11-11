#!/usr/bin/env bash
# Emit one Playwright spec path per line for HyperExecute static discovery.
#
# Only emits specs that can match playwright.testmu.config.ts grep /@Performance\b/.
# Specs tagged only with area tags (for example @PerformanceSwaps) are excluded.
#
# Agent-driven Markdown scenarios (*.scenario.spec.ts, tag @PerformanceShadow) run
# through tests/playwright.scenario-shadow.config.ts. They are emitted only when
# GREP_TAGS selects @PerformanceShadow, so an unfiltered run (schedule, full-suite
# label) is unchanged.
#
# Usage: BUILD_TYPE=onboarding|imported-wallet [GREP_TAGS=...] ./.github/scripts/qa-automation/performance-tests/hyperexecute-discover-performance-tests.sh
set -euo pipefail

BUILD_TYPE="${BUILD_TYPE:-}"
GREP_TAGS="${GREP_TAGS:-}"
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

include_scenarios=false
include_specs=true
# Test-branch only: @PerfHealTest selects the two deliberately broken scenarios.
include_heal_test=false
if [[ "$GREP_TAGS" == *@PerformanceShadow* ]]; then
  include_scenarios=true
fi
if [[ "$GREP_TAGS" == *@PerfHealTest* ]]; then
  include_heal_test=true
  include_scenarios=true
fi
# A scenarios-only selection would leave every other spec as an empty task.
if [[ "$GREP_TAGS" == "@PerformanceShadow" || "$GREP_TAGS" == "@PerfHealTest" ]]; then
  include_specs=false
fi

found=0
while IFS= read -r -d '' file; do
  if [[ "$file" == *.scenario.spec.ts ]]; then
    if [[ "$include_heal_test" == true && "$GREP_TAGS" != *@PerformanceShadow* ]]; then
      # The tag lives in the Markdown, not the thin spec.
      scenario_md="${file%.spec.ts}.md"
      if [[ -f "$scenario_md" ]] && grep -q '@PerfHealTest' "$scenario_md"; then
        selected=true
      else
        selected=false
      fi
    else
      selected="$include_scenarios"
    fi
  elif [[ "$include_specs" == true ]] && has_performance_type_tag "$file"; then
    selected=true
  else
    selected=false
  fi
  if [[ "$selected" == true ]]; then
    printf '%s\n' "$file"
    found=$((found + 1))
  fi
done < <(find "${ROOTS[@]}" -type f -name '*.spec.ts' -print0 | LC_ALL=C sort -z)

if [[ "$found" -eq 0 ]]; then
  # The heal-test tag only matches login scenarios, so the onboarding lane is empty.
  if [[ "$GREP_TAGS" == "@PerfHealTest" ]]; then
    exit 0
  fi
  echo "No @Performance specs found under ${ROOTS[*]} for BUILD_TYPE=$BUILD_TYPE" >&2
  exit 1
fi
