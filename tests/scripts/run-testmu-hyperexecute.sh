#!/usr/bin/env bash
# Submit the Android performance suite to TestMu AI HyperExecute.
#
# Required env:
#   BUILD_TYPE              onboarding | imported-wallet
#   LT_USERNAME / LT_ACCESS_KEY
#   TESTMU_DEVICE / TESTMU_OS_VERSION
#   App URL env vars consumed by tests/playwright.testmu.config.ts
#
# Optional:
#   HE_CONCURRENCY          default 2
#   HE_REGION               default us
#   GREP_TAGS               optional playwright --grep
#   HE_WORKDIR              default ./tmp/hyperexecute
#
# Secrets are written to a job-secret file outside the repo and referenced from
# the generated YAML as ${{.secrets.NAME}}. They are never embedded in the YAML.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BUILD_TYPE="${BUILD_TYPE:-}"
LT_USERNAME="${LT_USERNAME:-}"
LT_ACCESS_KEY="${LT_ACCESS_KEY:-}"
HE_CONCURRENCY="${HE_CONCURRENCY:-2}"
HE_REGION="${HE_REGION:-us}"
HE_WORKDIR="${HE_WORKDIR:-./tmp/hyperexecute}"
GREP_TAGS="${GREP_TAGS:-}"

if [[ -z "$BUILD_TYPE" || -z "$LT_USERNAME" || -z "$LT_ACCESS_KEY" ]]; then
  echo "BUILD_TYPE, LT_USERNAME, and LT_ACCESS_KEY are required" >&2
  exit 1
fi

case "$BUILD_TYPE" in
  onboarding|imported-wallet) ;;
  *)
    echo "Unsupported BUILD_TYPE: $BUILD_TYPE" >&2
    exit 1
    ;;
esac

mkdir -p "$HE_WORKDIR"
HE_BIN="$HE_WORKDIR/hyperexecute"
HE_YAML="$HE_WORKDIR/performance-${BUILD_TYPE}.generated.yaml"

SECRETS_FILE="$(mktemp "${TMPDIR:-/tmp}/mm-he-job-secrets.XXXXXX")"
chmod 600 "$SECRETS_FILE"
cleanup_secrets() {
  if [[ -n "${SECRETS_FILE:-}" && -f "$SECRETS_FILE" ]]; then
    : > "$SECRETS_FILE" 2>/dev/null || true
    rm -f "$SECRETS_FILE"
  fi
}
trap cleanup_secrets EXIT

if [[ ! -x "$HE_BIN" ]]; then
  echo "Downloading HyperExecute CLI (linux)..."
  curl -fsSL -o "$HE_BIN" "https://downloads.lambdatest.com/hyperexecute/linux/hyperexecute"
  chmod +x "$HE_BIN"
fi

yaml_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

write_secret() {
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "$key" "$value" >> "$SECRETS_FILE"
}

write_secret "LT_USERNAME" "$LT_USERNAME"
write_secret "LT_ACCESS_KEY" "$LT_ACCESS_KEY"
write_secret "MM_TEST_ACCOUNT_SRP" "${MM_TEST_ACCOUNT_SRP:-}"
write_secret "TEST_SRP_1" "${TEST_SRP_1:-}"
write_secret "TEST_SRP_2" "${TEST_SRP_2:-}"
write_secret "TEST_SRP_3" "${TEST_SRP_3:-}"
write_secret "TEST_SRP_4" "${TEST_SRP_4:-}"
write_secret "E2E_PASSWORD" "${E2E_PASSWORD:-}"
write_secret "E2E_PERFORMANCE_SENTRY_DSN" "${E2E_PERFORMANCE_SENTRY_DSN:-}"

RESOLVED_ANDROID_APP_URL="${TESTMU_ANDROID_APP_URL:-}"
RESOLVED_ANDROID_CLEAN_URL="${TESTMU_ANDROID_CLEAN_APP_URL:-$RESOLVED_ANDROID_APP_URL}"
RESOLVED_ANDROID_ONBOARDING_URL="${TESTMU_ANDROID_ONBOARDING_PERF_APP_URL:-$RESOLVED_ANDROID_CLEAN_URL}"
RESOLVED_ANDROID_SEEDLESS_URL="${TESTMU_ANDROID_SEEDLESS_PERF_APP_URL:-$RESOLVED_ANDROID_CLEAN_URL}"

case "$BUILD_TYPE" in
  onboarding) PRIMARY_APP_URL="$RESOLVED_ANDROID_CLEAN_URL" ;;
  imported-wallet) PRIMARY_APP_URL="$RESOLVED_ANDROID_APP_URL" ;;
esac

if [[ -z "$PRIMARY_APP_URL" ]]; then
  echo "Primary app URL for BUILD_TYPE=$BUILD_TYPE is empty" >&2
  exit 1
fi

chmod +x ./tests/scripts/verify-testmu-app-url.sh
LT_USERNAME="$LT_USERNAME" LT_ACCESS_KEY="$LT_ACCESS_KEY" \
  ./tests/scripts/verify-testmu-app-url.sh "$PRIMARY_APP_URL"

DISCOVERY_LIST="${HE_WORKDIR}/discovered-${BUILD_TYPE}.txt"
BUILD_TYPE="$BUILD_TYPE" bash ./tests/scripts/hyperexecute-discover-performance-tests.sh \
  > "$DISCOVERY_LIST"
DISCOVERY_COUNT="$(wc -l < "$DISCOVERY_LIST" | tr -d ' ')"
if [[ "$DISCOVERY_COUNT" -lt 1 ]]; then
  echo "Discovery produced no specs for BUILD_TYPE=$BUILD_TYPE" >&2
  exit 1
fi

mkdir -p tests/hyperexecute
cp -f "$DISCOVERY_LIST" "tests/hyperexecute/discovered-${BUILD_TYPE}.txt"
echo "Discovered ${DISCOVERY_COUNT} @Performance spec(s) for BUILD_TYPE=$BUILD_TYPE"

# YAML 0.2. framework.name=appium so tasks open Appium sessions on
# mobile-hub.lambdatest.com. Tasks run on linux VMs (runson: linux).
cat > "$HE_YAML" <<EOF
version: "0.2"
runson: linux
autosplit: true
concurrency: ${HE_CONCURRENCY}
dynamicAllocation: true
globalTimeout: 180
testSuiteTimeout: 180
testSuiteStep: 180
retryOnFailure: false
shell: bash

runtime:
  language: node
  version: "24"

pre:
  - corepack enable
  - yarn --immutable
  - yarn setup:github-ci --node

cacheKey: '{{ checksum "yarn.lock" }}'
cacheDirectories:
  - .yarn/cache
  - node_modules

framework:
  name: appium
  args:
    region: "$(yaml_escape "$HE_REGION")"
    mobileDC: true
    reservation: false

env:
  CI: "true"
  BUILD_TYPE: "$(yaml_escape "$BUILD_TYPE")"
  LT_USERNAME: \${{.secrets.LT_USERNAME}}
  LT_ACCESS_KEY: \${{.secrets.LT_ACCESS_KEY}}
  TESTMU_DEVICE: "$(yaml_escape "${TESTMU_DEVICE:-}")"
  TESTMU_OS_VERSION: "$(yaml_escape "${TESTMU_OS_VERSION:-}")"
  TESTMU_BUILD_NAME: "$(yaml_escape "${TESTMU_BUILD_NAME:-HyperExecute-Performance}")"
  TESTMU_GEO_LOCATION: "$(yaml_escape "${TESTMU_GEO_LOCATION:-SE}")"
  TEST_PLATFORM: "$(yaml_escape "${TEST_PLATFORM:-android}")"
  QA_APP_VERSION: "$(yaml_escape "${QA_APP_VERSION:-HyperExecute}")"
  E2E_PERFORMANCE_CLOUD_PROVIDER: "testmu"
  DISABLE_VIDEO_DOWNLOAD: "true"
  PLAYWRIGHT_WORKERS: "1"
  GREP_TAGS: "$(yaml_escape "$GREP_TAGS")"
  MM_TEST_ACCOUNT_SRP: \${{.secrets.MM_TEST_ACCOUNT_SRP}}
  TEST_SRP_1: \${{.secrets.TEST_SRP_1}}
  TEST_SRP_2: \${{.secrets.TEST_SRP_2}}
  TEST_SRP_3: \${{.secrets.TEST_SRP_3}}
  TEST_SRP_4: \${{.secrets.TEST_SRP_4}}
  E2E_PASSWORD: \${{.secrets.E2E_PASSWORD}}
  E2E_PERFORMANCE_SENTRY_DSN: \${{.secrets.E2E_PERFORMANCE_SENTRY_DSN}}
  E2E_PERFORMANCE_SENTRY_ENVIRONMENT: "$(yaml_escape "${E2E_PERFORMANCE_SENTRY_ENVIRONMENT:-github-actions-performance-e2e-testmu-he}")"
  E2E_PERFORMANCE_SENTRY_RELEASE: "$(yaml_escape "${E2E_PERFORMANCE_SENTRY_RELEASE:-}")"
  E2E_PERFORMANCE_BUILD_VARIANT: "$(yaml_escape "${E2E_PERFORMANCE_BUILD_VARIANT:-rc}")"
  E2E_PERFORMANCE_CI_BUILD_VARIANT: "$(yaml_escape "${E2E_PERFORMANCE_CI_BUILD_VARIANT:-e2e}")"
  E2E_PERFORMANCE_RELEASE_VERSION: "$(yaml_escape "${E2E_PERFORMANCE_RELEASE_VERSION:-}")"
  E2E_PERFORMANCE_GITHUB_REF_NAME: "$(yaml_escape "${E2E_PERFORMANCE_GITHUB_REF_NAME:-}")"
  TESTMU_ANDROID_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_APP_URL")"
  TESTMU_ANDROID_CLEAN_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_CLEAN_URL")"
  TESTMU_ANDROID_ONBOARDING_PERF_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_ONBOARDING_URL")"
  TESTMU_ANDROID_SEEDLESS_PERF_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_SEEDLESS_URL")"
  HE_REGION: "$(yaml_escape "$HE_REGION")"

mergeArtifacts: true
uploadArtefacts:
  - name: performance-reports
    path:
      - tests/reporters/reports/**
      - tests/test-reports/**

testDiscovery:
  type: raw
  mode: static
  command: cat tests/hyperexecute/discovered-${BUILD_TYPE}.txt

testRunnerCommand: bash ./tests/scripts/hyperexecute-run-performance-test.sh \$test

jobLabel: ['MMQA', 'HyperExecute', 'TestMu', '$(yaml_escape "$BUILD_TYPE")']
EOF

echo "=== Generated HyperExecute YAML: $HE_YAML ==="
# The YAML references secrets by name only.
cat "$HE_YAML"
echo "Primary app URL: $PRIMARY_APP_URL"
echo "Device: ${TESTMU_DEVICE:-<unset>} / ${TESTMU_OS_VERSION:-<unset>}"
echo "Concurrency: $HE_CONCURRENCY"

chmod +x \
  ./tests/scripts/hyperexecute-discover-performance-tests.sh \
  ./tests/scripts/hyperexecute-run-performance-test.sh \
  ./tests/scripts/run-testmu-hyperexecute.sh

HE_ARTIFACTS_DIR="${HE_WORKDIR}/downloaded-artifacts"
HE_CLI_LOG="${HE_WORKDIR}/hyperexecute-cli.log"
mkdir -p "$HE_ARTIFACTS_DIR"

set +e
"$HE_BIN" \
  --user "$LT_USERNAME" \
  --key "$LT_ACCESS_KEY" \
  --config "$HE_YAML" \
  --job-secret-file "$SECRETS_FILE" \
  --download-artifacts \
  --download-artifacts-path "$HE_ARTIFACTS_DIR" \
  --force-clean-artifacts \
  --verbose 2>&1 | tee "$HE_CLI_LOG"
HE_EXIT=${PIPESTATUS[0]}
set -e

echo "HyperExecute CLI exit code: $HE_EXIT"

HE_JOB_ID="$(
  grep -Eo 'Job ID:[[:space:]]*[0-9a-fA-F-]{36}' "$HE_CLI_LOG" 2>/dev/null \
    | tail -1 \
    | awk '{print $NF}'
)"
if [[ -z "$HE_JOB_ID" ]]; then
  HE_JOB_ID="$(
    grep -Eo 'jobId=[0-9a-fA-F-]{36}' "$HE_CLI_LOG" 2>/dev/null \
      | tail -1 \
      | cut -d= -f2
  )"
fi

if [[ -n "$HE_JOB_ID" ]]; then
  echo "HyperExecute Job ID: $HE_JOB_ID"
  echo "Job Link: https://hyperexecute.lambdatest.com/hyperexecute/task?jobId=$HE_JOB_ID"

  HE_API_ZIP="${HE_ARTIFACTS_DIR}/performance-reports.zip"
  echo "Downloading artefacts via HyperExecute API (performance-reports)..."
  set +e
  HTTP_CODE="$(
    curl -sS -u "${LT_USERNAME}:${LT_ACCESS_KEY}" \
      -o "$HE_API_ZIP" \
      -w "%{http_code}" \
      "https://api.hyperexecute.cloud/v2.0/artefacts/${HE_JOB_ID}/download?name=performance-reports"
  )"
  CURL_EXIT=$?
  set -e
  echo "Artefacts API HTTP status: ${HTTP_CODE:-n/a} (curl exit=${CURL_EXIT})"

  if [[ "$CURL_EXIT" -eq 0 && "$HTTP_CODE" == "200" && -s "$HE_API_ZIP" ]]; then
    unzip -o -q "$HE_API_ZIP" -d "$HE_ARTIFACTS_DIR" || true
  else
    echo "Artefacts API download did not return a zip (status=${HTTP_CODE:-n/a})."
  fi
else
  echo "Could not parse HyperExecute Job ID from CLI log; skipping API artefact download."
fi

mkdir -p tests/reporters/reports tests/test-reports/playwright-report artifacts
if [[ -d "$HE_ARTIFACTS_DIR" ]]; then
  cp -R "$HE_ARTIFACTS_DIR"/. artifacts/ 2>/dev/null || true
fi

copy_report_files() {
  local root="$1"
  [[ -d "$root" ]] || return 0
  find "$root" -type f \( -name '*.json' -o -name '*.html' -o -name '*.csv' -o -name '*.zip' \) -print0 \
    | while IFS= read -r -d '' f; do
      base="$(basename "$f")"
      if [[ "$base" == *playwright* || "$f" == *playwright-report* ]]; then
        mkdir -p tests/test-reports/playwright-report
        cp -f "$f" "tests/test-reports/playwright-report/" 2>/dev/null || true
      else
        cp -f "$f" "tests/reporters/reports/" 2>/dev/null || true
      fi
    done
}

copy_report_files artifacts
copy_report_files "$HE_ARTIFACTS_DIR"

REPORT_COUNT="$(find tests/reporters/reports -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "tests/reporters/reports file count: ${REPORT_COUNT:-0}"

exit "$HE_EXIT"
