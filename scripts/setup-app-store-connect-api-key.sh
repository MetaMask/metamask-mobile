#!/usr/bin/env bash

# Setup App Store Connect API Key for Fastlane
# This script can be used in both Bitrise and GitHub Actions workflows
#
# Usage:
#   ./scripts/setup-app-store-connect-api-key.sh <issuer_id> <key_id> <key_content>
#
# Arguments:
#   issuer_id    - App Store Connect API Key Issuer ID
#   key_id       - App Store Connect API Key ID
#   key_content  - App Store Connect API Key content (.p8 file content)

set -e

# Check if exactly 3 arguments are provided
if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <issuer_id> <key_id> <key_content>"
  exit 1
fi

ISSUER_ID="$1"
KEY_ID="$2"
KEY_CONTENT="$3"

# Validate arguments are not empty
if [ -z "$ISSUER_ID" ]; then
  echo "❌ Error: issuer_id argument is required"
  exit 1
fi

if [ -z "$KEY_ID" ]; then
  echo "❌ Error: key_id argument is required"
  exit 1
fi

if [ -z "$KEY_CONTENT" ]; then
  echo "❌ Error: key_content argument is required"
  exit 1
fi

KEY_FILEPATH="$(pwd)/ios/AuthKey.p8"

# Write the .p8 key file using printf for safety (handles special characters correctly)
printf '%s' "$KEY_CONTENT" > "$KEY_FILEPATH"
chmod 600 "$KEY_FILEPATH"

# Export environment variables for Fastlane
export APP_STORE_CONNECT_API_KEY_ISSUER_ID="$ISSUER_ID"
export APP_STORE_CONNECT_API_KEY_KEY_ID="$KEY_ID"
export APP_STORE_CONNECT_API_KEY_KEY_FILEPATH="$KEY_FILEPATH"

# Persist variables based on CI environment (for passing to subsequent steps)
if [ -n "${BITRISE_BUILD_URL:-}" ] || command -v envman &> /dev/null; then
  # Use envman to persist variables in Bitrise
  if command -v envman &> /dev/null; then
    envman add --key APP_STORE_CONNECT_API_KEY_ISSUER_ID --value "$ISSUER_ID"
    envman add --key APP_STORE_CONNECT_API_KEY_KEY_ID --value "$KEY_ID"
    envman add --key APP_STORE_CONNECT_API_KEY_KEY_FILEPATH --value "$KEY_FILEPATH"
  fi
elif [ -n "${GITHUB_ENV:-}" ]; then
  # Use GITHUB_ENV to persist variables in GitHub Actions
  echo "APP_STORE_CONNECT_API_KEY_ISSUER_ID=$ISSUER_ID" >> "$GITHUB_ENV"
  echo "APP_STORE_CONNECT_API_KEY_KEY_ID=$KEY_ID" >> "$GITHUB_ENV"
  echo "APP_STORE_CONNECT_API_KEY_KEY_FILEPATH=$KEY_FILEPATH" >> "$GITHUB_ENV"
fi

echo "✅ App Store Connect API Key configured"

