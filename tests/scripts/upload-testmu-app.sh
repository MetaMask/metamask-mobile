#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <apk-path> <custom-id-prefix>" >&2
  exit 2
fi

APK_PATH="$1"
CUSTOM_ID_PREFIX="$2"
LT_USERNAME="${LT_USERNAME:?LT_USERNAME is required}"
LT_ACCESS_KEY="${LT_ACCESS_KEY:?LT_ACCESS_KEY is required}"

if [ ! -f "$APK_PATH" ]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

APK_SHA256="$(sha256sum "$APK_PATH" | awk '{print $1}')"
CUSTOM_ID="${CUSTOM_ID_PREFIX}-${APK_SHA256:0:32}"
LIST_URL="https://manual-api.lambdatest.com/app/data?type=android&level=user"

APP_LIST="$(curl -fsS -u "$LT_USERNAME:$LT_ACCESS_KEY" "$LIST_URL")"
EXISTING_APP_URL="$(
  jq -r --arg custom_id "$CUSTOM_ID" '
    .. | objects
    | select(
        (.custom_id? // .customId? // .name? // "") == $custom_id
      )
    | (.app_url? // .appUrl? // empty)
  ' <<<"$APP_LIST" | awk 'NF { print; exit }'
)"

if [ -n "$EXISTING_APP_URL" ]; then
  echo "Reusing existing TestMu app for $CUSTOM_ID" >&2
  printf '%s\n' "$EXISTING_APP_URL"
  exit 0
fi

RESPONSE="$(
  curl -fsS -u "$LT_USERNAME:$LT_ACCESS_KEY" \
    -X POST "https://manual-api.lambdatest.com/app/upload/realDevice" \
    -F "appFile=@$APK_PATH" \
    -F "name=$CUSTOM_ID" \
    -F "custom_id=$CUSTOM_ID" \
    -F "visibility=team"
)"

APP_URL="$(jq -r '.app_url // .appUrl // empty' <<<"$RESPONSE")"
if [ -z "$APP_URL" ]; then
  echo "TestMu upload returned no app URL: $RESPONSE" >&2
  exit 1
fi

printf '%s\n' "$APP_URL"
