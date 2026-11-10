#!/usr/bin/env bash
# HyperExecute testRunnerCommand entrypoint.
# Runs one discovered Playwright spec against the TestMu AI Appium hub.
set -euo pipefail

TEST_FILE="${1:-${test:-}}"
if [[ -z "$TEST_FILE" ]]; then
  echo "Missing test file argument (\$test)" >&2
  exit 1
fi

BUILD_TYPE="${BUILD_TYPE:-imported-wallet}"
GREP_TAGS="${GREP_TAGS:-}"
CONFIG="tests/playwright.testmu.config.ts"
PROJECT_PREFIX="testmu-android"
if [[ "$TEST_FILE" == *.scenario.spec.ts ]]; then
  # Agent-driven scenarios have their own config and projects.
  CONFIG="tests/playwright.scenario-shadow.config.ts"
  PROJECT_PREFIX="scenario-shadow-testmu-android"
fi

export PLAYWRIGHT_WORKERS="${PLAYWRIGHT_WORKERS:-1}"

select_project_args() {
  case "$BUILD_TYPE" in
    onboarding)
      if [[ "$TEST_FILE" == *'/seedless-'* ]]; then
        echo --project "${PROJECT_PREFIX}-onboarding-seedless"
      else
        echo --project "${PROJECT_PREFIX}-onboarding"
      fi
      ;;
    imported-wallet)
      echo --project "$PROJECT_PREFIX"
      ;;
    *)
      echo "Unsupported BUILD_TYPE: $BUILD_TYPE" >&2
      exit 1
      ;;
  esac
}

PROJECT_ARGS="$(select_project_args)"
CMD=(yarn playwright test "$TEST_FILE" $PROJECT_ARGS --config "$CONFIG" --workers="$PLAYWRIGHT_WORKERS")

if [[ -n "$GREP_TAGS" ]]; then
  # Discovery is file-based, so a tag-filtered file may contain no selected tests.
  CMD+=(--grep "$GREP_TAGS" --pass-with-no-tests)
fi

echo "=== HyperExecute running: ${CMD[*]} ==="
"${CMD[@]}"
