#!/usr/bin/env bash
# Verify a TestMu AI / LambdaTest lt:// app URL is resolvable in app storage
# before starting HyperExecute / Appium sessions.
#
# Usage:
#   LT_USERNAME=... LT_ACCESS_KEY=... ./tests/scripts/verify-testmu-app-url.sh lt://APP...
#
# Optional env:
#   TESTMU_APP_VERIFY_ATTEMPTS   default 18  (~3 min with default sleep)
#   TESTMU_APP_VERIFY_SLEEP_SEC  default 10
#
# Exit 0 when the app_id is listed under user or organization android apps.
# Exit 1 on timeout / missing credentials / invalid URL.
set -euo pipefail

APP_URL="${1:-}"
LT_USERNAME="${LT_USERNAME:-}"
LT_ACCESS_KEY="${LT_ACCESS_KEY:-}"
ATTEMPTS="${TESTMU_APP_VERIFY_ATTEMPTS:-18}"
SLEEP_SEC="${TESTMU_APP_VERIFY_SLEEP_SEC:-10}"

if [[ -z "$APP_URL" || -z "$LT_USERNAME" || -z "$LT_ACCESS_KEY" ]]; then
  echo "❌ Usage requires lt://APP... arg and LT_USERNAME / LT_ACCESS_KEY" >&2
  exit 1
fi

if [[ "$APP_URL" != lt://APP* ]]; then
  echo "❌ Invalid TestMu app URL (expected lt://APP...): $APP_URL" >&2
  exit 1
fi

APP_ID="${APP_URL#lt://}"

app_listed() {
  local level="$1"
  local response
  local http_code
  response="$(
    curl -sS -u "$LT_USERNAME:$LT_ACCESS_KEY" \
      -w '\n%{http_code}' \
      "https://manual-api.lambdatest.com/app/data?type=android&level=${level}&limit=100"
  )"
  http_code="$(printf '%s' "$response" | tail -n1)"
  body="$(printf '%s' "$response" | sed '$d')"

# Fail fast on auth errors so CI does not burn ~3 minutes polling.
  if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
    echo "❌ app/data level=${level} HTTP ${http_code}: unauthorized (check LT_USERNAME / LT_ACCESS_KEY)" >&2
    exit 1
  fi

  if [[ "$http_code" != "200" ]]; then
    echo "  ⚠️  app/data level=${level} HTTP ${http_code}: $(printf '%s' "$body" | head -c 200)"
    return 1
  fi

  printf '%s' "$body" | jq -e --arg id "$APP_ID" '
    (.data // [])
    | map(.app_id // empty)
    | index($id) != null
  ' >/dev/null 2>&1
}

echo "Verifying TestMu app is listed in storage: $APP_URL"

for attempt in $(seq 1 "$ATTEMPTS"); do
  if app_listed user || app_listed organization; then
    echo "✅ App $APP_ID found in TestMu android catalog (attempt ${attempt}/${ATTEMPTS})"

    # Best-effort processing probe (network/patch readiness). Empty patched_url
    # is acceptable for install; we only fail hard if the API rejects the appId.
    patch_body="$(
      curl -sS -u "$LT_USERNAME:$LT_ACCESS_KEY" \
        -H 'Content-Type: application/json' \
        -X POST 'https://mobile-api.lambdatest.com/mobile-automation/api/v1/fetchpatchedapkurl' \
        -d "{\"appId\":\"${APP_ID}\",\"networkLogsEnabled\":true}" \
        || true
    )"
    if printf '%s' "$patch_body" | jq -e '.status == "success" or .data.status == "success"' >/dev/null 2>&1; then
      echo "  Processing probe OK for $APP_ID"
    else
      echo "  Processing probe response (non-blocking): $(printf '%s' "$patch_body" | head -c 240)"
    fi
    exit 0
  fi

  echo "  ⏳ App $APP_ID not listed yet (attempt ${attempt}/${ATTEMPTS}); sleeping ${SLEEP_SEC}s..."
  sleep "$SLEEP_SEC"
done

echo "❌ Timed out waiting for TestMu app storage to list $APP_ID" >&2
exit 1
