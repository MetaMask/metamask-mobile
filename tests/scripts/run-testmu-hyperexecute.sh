#!/usr/bin/env bash
# Trigger MetaMask performance suites on TestMu AI HyperExecute.
#
# Required env:
#   BUILD_TYPE              onboarding | imported-wallet | mm-connect
#   LT_USERNAME / LT_ACCESS_KEY
#   TESTMU_DEVICE / TESTMU_OS_VERSION
#   App URL env vars used by playwright.testmu.config.ts
#
# Optional:
#   HE_CONCURRENCY          default 3
#   HE_REGION               default us
#   GREP_TAGS               optional playwright --grep
#   HE_WORKDIR              default ./tmp/hyperexecute
#
# Security:
#   Sensitive values are written to a job-secret file outside the repo
#   (via HyperExecute --job-secret-file) and referenced from YAML as
#   ${{.secrets.NAME}}. They are never embedded in the generated YAML and
#   must not be uploaded as GitHub Actions artifacts.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BUILD_TYPE="${BUILD_TYPE:-}"
LT_USERNAME="${LT_USERNAME:-}"
LT_ACCESS_KEY="${LT_ACCESS_KEY:-}"
HE_CONCURRENCY="${HE_CONCURRENCY:-3}"
HE_REGION="${HE_REGION:-us}"
HE_WORKDIR="${HE_WORKDIR:-./tmp/hyperexecute}"
GREP_TAGS="${GREP_TAGS:-}"

if [[ -z "$BUILD_TYPE" || -z "$LT_USERNAME" || -z "$LT_ACCESS_KEY" ]]; then
  echo "❌ BUILD_TYPE, LT_USERNAME, and LT_ACCESS_KEY are required" >&2
  exit 1
fi

case "$BUILD_TYPE" in
  onboarding|imported-wallet|mm-connect) ;;
  *)
    echo "❌ Unsupported BUILD_TYPE: $BUILD_TYPE" >&2
    exit 1
    ;;
esac

mkdir -p "$HE_WORKDIR"
HE_BIN="$HE_WORKDIR/hyperexecute"
HE_YAML="$HE_WORKDIR/performance-${BUILD_TYPE}.generated.yaml"

# Secrets live outside the workspace so they are not part of the HE upload
# payload and cannot be retained via GHA artifacts of tmp/hyperexecute/.
SECRETS_FILE="$(mktemp "${TMPDIR:-/tmp}/mm-he-job-secrets.XXXXXX")"
chmod 600 "$SECRETS_FILE"
cleanup_secrets() {
  if [[ -n "${SECRETS_FILE:-}" && -f "$SECRETS_FILE" ]]; then
    # Best-effort wipe before unlink
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

# Escape values for YAML double-quoted scalars (non-secret env only)
yaml_escape() {
  # shellcheck disable=SC2001
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# Append KEY=VALUE to the HyperExecute job-secret file (value may contain '=').
write_secret() {
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "$key" "$value" >> "$SECRETS_FILE"
}

APP_URL_KEY="TESTMU_ANDROID_APP_URL"
case "$BUILD_TYPE" in
  onboarding)
    APP_URL_KEY="TESTMU_ANDROID_CLEAN_APP_URL"
    ;;
esac

# Sensitive credentials → job-secret file (referenced as ${{.secrets.*}} in YAML)
write_secret "LT_USERNAME" "$LT_USERNAME"
write_secret "LT_ACCESS_KEY" "$LT_ACCESS_KEY"
write_secret "MM_TEST_ACCOUNT_SRP" "${MM_TEST_ACCOUNT_SRP:-}"
write_secret "TEST_SRP_1" "${TEST_SRP_1:-}"
write_secret "TEST_SRP_2" "${TEST_SRP_2:-}"
write_secret "TEST_SRP_3" "${TEST_SRP_3:-}"
write_secret "TEST_SRP_4" "${TEST_SRP_4:-}"
write_secret "E2E_PASSWORD" "${E2E_PASSWORD:-}"
write_secret "E2E_PERFORMANCE_SENTRY_DSN" "${E2E_PERFORMANCE_SENTRY_DSN:-}"

# Resolve app URLs once so empty-string env vars don't wipe fallbacks in YAML.
RESOLVED_ANDROID_APP_URL="${TESTMU_ANDROID_APP_URL:-}"
RESOLVED_ANDROID_CLEAN_URL="${TESTMU_ANDROID_CLEAN_APP_URL:-$RESOLVED_ANDROID_APP_URL}"
RESOLVED_ANDROID_ONBOARDING_URL="${TESTMU_ANDROID_ONBOARDING_PERF_APP_URL:-$RESOLVED_ANDROID_CLEAN_URL}"
RESOLVED_ANDROID_SEEDLESS_URL="${TESTMU_ANDROID_SEEDLESS_PERF_APP_URL:-$RESOLVED_ANDROID_CLEAN_URL}"

# Use YAML 0.1: version 0.2 requires framework.name and drops support for
# custom testDiscovery / testRunnerCommand (see HyperExecute YAML 0.2 docs).
# This PoC orchestrates Appium-via-Playwright with our own discovery/runner.
cat > "$HE_YAML" <<EOF
version: "0.1"
runson: linux
autosplit: true
concurrency: ${HE_CONCURRENCY}
globalTimeout: 180
testSuiteTimeout: 180
testSuiteStep: 180
retryOnFailure: false

runtime:
  language: node
  version: "24"

pre:
  - corepack enable
  - yarn --immutable

cacheKey: '{{ checksum "yarn.lock" }}'
cacheDirectories:
  - .yarn/cache
  - node_modules

env:
  BUILD_TYPE: "$(yaml_escape "$BUILD_TYPE")"
  LT_USERNAME: \${{.secrets.LT_USERNAME}}
  LT_ACCESS_KEY: \${{.secrets.LT_ACCESS_KEY}}
  TESTMU_DEVICE: "$(yaml_escape "${TESTMU_DEVICE:-Pixel 8 Pro}")"
  TESTMU_OS_VERSION: "$(yaml_escape "${TESTMU_OS_VERSION:-14}")"
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
  E2E_PERFORMANCE_SENTRY_ENVIRONMENT: "$(yaml_escape "${E2E_PERFORMANCE_SENTRY_ENVIRONMENT:-hyperexecute-performance-e2e-testmu}")"
  E2E_PERFORMANCE_SENTRY_RELEASE: "$(yaml_escape "${E2E_PERFORMANCE_SENTRY_RELEASE:-}")"
  E2E_PERFORMANCE_BUILD_VARIANT: "$(yaml_escape "${E2E_PERFORMANCE_BUILD_VARIANT:-rc}")"
  TESTMU_ANDROID_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_APP_URL")"
  TESTMU_ANDROID_CLEAN_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_CLEAN_URL")"
  TESTMU_ANDROID_ONBOARDING_PERF_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_ONBOARDING_URL")"
  TESTMU_ANDROID_SEEDLESS_PERF_APP_URL: "$(yaml_escape "$RESOLVED_ANDROID_SEEDLESS_URL")"
  TESTMU_RN_PLAYGROUND_URL: "$(yaml_escape "${TESTMU_RN_PLAYGROUND_URL:-}")"
  TESTMU_LOCAL: "$(yaml_escape "${TESTMU_LOCAL:-false}")"
  HE_REGION: "$(yaml_escape "$HE_REGION")"

mergeArtifacts: true
uploadArtefacts:
  - name: performance-reports
    path:
      - tests/reporters/reports/**
      - tests/test-reports/**

testDiscovery:
  type: raw
  mode: dynamic
  command: BUILD_TYPE=${BUILD_TYPE} bash ./tests/scripts/hyperexecute-discover-performance-tests.sh

testRunnerCommand: bash ./tests/scripts/hyperexecute-run-performance-test.sh \$test

jobLabel: ['MMQA', 'HyperExecute', 'TestMu', '${BUILD_TYPE}', 'Pixel8Pro']
EOF

echo "=== Generated HyperExecute YAML: $HE_YAML ==="
echo "Secrets file: (outside workspace, wiped on exit)"
echo "Primary app env key: $APP_URL_KEY=${!APP_URL_KEY:-<empty>}"
echo "Device: ${TESTMU_DEVICE:-Pixel 8 Pro} / ${TESTMU_OS_VERSION:-14}"
echo "Concurrency: $HE_CONCURRENCY"

# Ensure scripts are executable inside the uploaded payload
chmod +x \
  ./tests/scripts/hyperexecute-discover-performance-tests.sh \
  ./tests/scripts/hyperexecute-run-performance-test.sh \
  ./tests/scripts/start-testmu-tunnel.sh \
  ./tests/scripts/stop-testmu-tunnel.sh \
  ./tests/scripts/run-testmu-hyperexecute.sh

set +e
"$HE_BIN" \
  --user "$LT_USERNAME" \
  --key "$LT_ACCESS_KEY" \
  --config "$HE_YAML" \
  --job-secret-file "$SECRETS_FILE" \
  --verbose
HE_EXIT=$?
set -e

echo "HyperExecute CLI exit code: $HE_EXIT"

# Collect downloaded artefacts into the paths GHA already uploads.
mkdir -p tests/reporters/reports tests/test-reports/playwright-report
if compgen -G "artifacts/**" > /dev/null 2>&1; then
  echo "Copying HyperExecute artifacts/ into reporter paths..."
  find artifacts -type f \( -name '*.json' -o -name '*.html' -o -name '*.csv' -o -name '*.zip' \) -print0 \
    | while IFS= read -r -d '' f; do
      base="$(basename "$f")"
      if [[ "$base" == *playwright* || "$f" == *playwright-report* ]]; then
        cp -f "$f" "tests/test-reports/playwright-report/" 2>/dev/null || true
      else
        cp -f "$f" "tests/reporters/reports/" 2>/dev/null || true
      fi
    done
fi

# Also check common HE download folder names
for dir in hyperexecute-artifacts HyperExecute-Artifacts Artefacts artefacts; do
  if [[ -d "$dir" ]]; then
    echo "Found artefact dir: $dir"
    cp -R "$dir"/. tests/reporters/reports/ 2>/dev/null || true
  fi
done

exit "$HE_EXIT"
