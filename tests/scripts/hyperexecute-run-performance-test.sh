#!/usr/bin/env bash
# HyperExecute testRunnerCommand entrypoint.
# Runs a single discovered Playwright spec file against TestMu AI Appium cloud.
#
# HyperExecute interpolates $test from testDiscovery. Additional env is provided
# by the generated HyperExecute YAML / GITHUB_ENV bridge.
set -euo pipefail

TEST_FILE="${1:-${test:-}}"
if [[ -z "$TEST_FILE" ]]; then
  echo "❌ Missing test file argument (\$test)" >&2
  exit 1
fi

BUILD_TYPE="${BUILD_TYPE:-imported-wallet}"
GREP_TAGS="${GREP_TAGS:-}"
CONFIG="tests/playwright.testmu.config.ts"

# Prefer one worker per HE task; autosplit provides cross-file parallelism.
export PLAYWRIGHT_WORKERS="${PLAYWRIGHT_WORKERS:-1}"

start_tunnel_if_needed() {
  if [[ "$BUILD_TYPE" != "mm-connect" ]]; then
    return 0
  fi
  export TESTMU_LOCAL=true
  # Unique tunnel per HE task to avoid collisions under autosplit.
  export TESTMU_TUNNEL_NAME="${TESTMU_TUNNEL_NAME:-he-mm-connect-${HYPEREXECUTE_TASK_ID:-${HOSTNAME:-local}}-$$}"
  export TUNNEL_NAME="$TESTMU_TUNNEL_NAME"
  echo "Starting TestMu tunnel for mm-connect: $TUNNEL_NAME"
  bash ./tests/scripts/start-testmu-tunnel.sh
}

stop_tunnel_if_needed() {
  if [[ "$BUILD_TYPE" != "mm-connect" ]]; then
    return 0
  fi
  bash ./tests/scripts/stop-testmu-tunnel.sh || true
}

select_project_args() {
  case "$BUILD_TYPE" in
    onboarding)
      if [[ "$TEST_FILE" == *'/seedless-'* ]]; then
        echo --project testmu-android-onboarding-seedless
      else
        echo --project testmu-android-onboarding
      fi
      ;;
    mm-connect)
      echo --project testmu-mm-connect-android
      ;;
    *)
      echo --project testmu-android
      ;;
  esac
}

start_tunnel_if_needed
trap stop_tunnel_if_needed EXIT

PROJECT_ARGS="$(select_project_args)"
CMD=(yarn playwright test "$TEST_FILE" $PROJECT_ARGS --config "$CONFIG" --workers="$PLAYWRIGHT_WORKERS")

if [[ -n "$GREP_TAGS" ]]; then
  # Discovery is file-based, so a tag-filtered file may legitimately contain
  # no selected tests. Unfiltered tasks remain strict.
  CMD+=(--grep "$GREP_TAGS" --pass-with-no-tests)
fi

echo "=== HyperExecute running: ${CMD[*]} ==="
"${CMD[@]}"
