#!/usr/bin/env bash
#
# Fetches Apple App Store Connect API keys from AWS Secrets Manager
# and exports them to GITHUB_ENV for subsequent workflow steps.
#
# Prerequisites: AWS credentials must already be configured (e.g. via
# aws-actions/configure-aws-credentials before calling this script).
#
# Usage: fetch-apple-api-keys-from-aws.sh [secret-id]
#   secret-id: AWS Secrets Manager secret ID
#              (default: metamask-mobile-main-apple-api-keys)

set -euo pipefail

SECRET_ID="${1:-metamask-mobile-main-apple-api-keys}"

echo "🔐 Fetching App Store Connect API keys from Secrets Manager..."
secret_json=$(aws secretsmanager get-secret-value \
  --region 'us-east-2' \
  --secret-id "$SECRET_ID" \
  --query SecretString \
  --output text)

for key in APP_STORE_CONNECT_API_KEY_ISSUER_ID APP_STORE_CONNECT_API_KEY_KEY_ID; do
  value=$(echo "$secret_json" | jq -r --arg k "$key" '.[$k] // empty')
  if [ -z "$value" ]; then
    echo "::error::Missing key in secret: $key"
    exit 1
  fi
  echo "::add-mask::$value"
  echo "${key}=${value}" >> "$GITHUB_ENV"
done

key=APP_STORE_CONNECT_API_KEY_KEY_CONTENT
value=$(echo "$secret_json" | jq -r --arg k "$key" '.[$k] // empty')
if [ -z "$value" ]; then
  echo "::error::Missing key in secret: $key"
  exit 1
fi
while IFS= read -r line || [ -n "$line" ]; do
  [ -n "$line" ] && echo "::add-mask::$line"
done <<< "$(printf '%s\n' "$value")"

delim="APPLEP8$(openssl rand -hex 16)"
{
  printf '%s<<%s\n' "$key" "$delim"
  printf '%s\n' "$value"
  printf '%s\n' "$delim"
} >> "$GITHUB_ENV"

echo "✅ Apple API keys loaded from AWS"
