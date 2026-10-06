#!/usr/bin/env bash
# Verify a TestMu AI lt:// app URL is listed in app storage before HyperExecute starts.
#
# Usage:
#   LT_USERNAME=... LT_ACCESS_KEY=... ./tests/scripts/verify-testmu-app-url.sh lt://APP...
#
# Optional env:
#   TESTMU_APP_VERIFY_ATTEMPTS   default 18
#   TESTMU_APP_VERIFY_SLEEP_SEC  default 10
set -euo pipefail

APP_URL="${1:-}"
LT_USERNAME="${LT_USERNAME:-}"
LT_ACCESS_KEY="${LT_ACCESS_KEY:-}"
ATTEMPTS="${TESTMU_APP_VERIFY_ATTEMPTS:-18}"
SLEEP_SEC="${TESTMU_APP_VERIFY_SLEEP_SEC:-10}"

if [[ -z "$APP_URL" || -z "$LT_USERNAME" || -z "$LT_ACCESS_KEY" ]]; then
  echo "Usage requires an lt://APP... argument and LT_USERNAME / LT_ACCESS_KEY" >&2
  exit 1
fi

if [[ "$APP_URL" != lt://APP* ]]; then
  echo "Invalid TestMu app URL (expected lt://APP...): $APP_URL" >&2
  exit 1
fi

APP_ID="${APP_URL#lt://}"

app_listed() {
  local level="$1"
  local response
  local http_code
  local body
  response="$(
    curl -sS -u "$LT_USERNAME:$LT_ACCESS_KEY" \
      -w '\n%{http_code}' \
      "https://manual-api.lambdatest.com/app/data?type=android&level=${level}&limit=100"
  )"
  http_code="$(printf '%s' "$response" | tail -n1)"
  body="$(printf '%s' "$response" | sed '$d')"

  if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
    echo "app/data level=${level} HTTP ${http_code}: unauthorized (check LT_USERNAME / LT_ACCESS_KEY)" >&2
    exit 1
  fi

  if [[ "$http_code" != "200" ]]; then
    echo "  app/data level=${level} HTTP ${http_code}: $(printf '%s' "$body" | head -c 200)"
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
    echo "App $APP_ID found in TestMu android catalog (attempt ${attempt}/${ATTEMPTS})"
    exit 0
  fi

  echo "  App $APP_ID not listed yet (attempt ${attempt}/${ATTEMPTS}); sleeping ${SLEEP_SEC}s..."
  sleep "$SLEEP_SEC"
done

echo "Timed out waiting for TestMu app storage to list $APP_ID" >&2
exit 1
