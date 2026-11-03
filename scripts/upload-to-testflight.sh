#!/usr/bin/env bash

# Upload IPA to TestFlight via Fastlane
#
# Usage:
#   ./scripts/upload-to-testflight.sh <pipeline_name> <branch> [ipa_path] [testflight_group] [distribute_external]
#
# Arguments:
#   pipeline_name       - Pipeline or workflow name (required)
#   branch              - Git branch name (required)
#   ipa_path            - Optional: Direct path to IPA file (if not provided, uses find-ipa-file.sh)
#   testflight_group    - Optional: TestFlight external testing group name (default: MetaMask BETA & Release Candidates)
#   distribute_external - Optional: Whether to distribute to external testers (default: false)
#
# Environment variables:
#   IPA_PATH - IPA path (set by find-ipa-file.sh if not provided as argument)

set -e

# Validate required arguments
if [ $# -lt 2 ]; then
  echo "Usage: $0 <pipeline_name> <branch> [ipa_path] [testflight_group]"
  exit 1
fi

PIPELINE_NAME="$1"
BRANCH="$2"
LOCAL_IPA_PATH="$3"
TESTFLIGHT_GROUP="${4:-MetaMask BETA & Release Candidates}"
DISTRIBUTE_EXTERNAL="${5:-false}"

# Get IPA path: use argument if provided, otherwise use find-ipa-file.sh
if [ -n "$LOCAL_IPA_PATH" ]; then
  # Use provided IPA path and convert to absolute if relative
  IPA_PATH="$LOCAL_IPA_PATH"
  if [[ "$IPA_PATH" != /* ]]; then
    IPA_PATH="$(pwd)/$IPA_PATH"
  fi
  if [ ! -f "$IPA_PATH" ]; then
    echo "❌ Error: IPA file not found at: $IPA_PATH"
    exit 1
  fi
else
  # Use find-ipa-file.sh to locate the IPA
  ./scripts/find-ipa-file.sh
  # IPA_PATH is now set by find-ipa-file.sh
fi

echo "🚀 Uploading to TestFlight..."
echo "IPA: $IPA_PATH"
echo "Group: $TESTFLIGHT_GROUP"

# Extract environment from pipeline name for changelog
# GitHub Actions passes "github_actions_<build_name>" (e.g. github_actions_main-exp); use segment after first "-" (e.g. exp).
if [[ "$PIPELINE_NAME" == github_actions_* ]]; then
  suffix="${PIPELINE_NAME#github_actions_}"
  ENVIRONMENT=$(echo "${suffix#*-}" | tr '[:lower:]' '[:upper:]')
else
  ENVIRONMENT=$(echo "$PIPELINE_NAME" | cut -d'_' -f1 | tr '[:lower:]' '[:upper:]')
fi
if [ -z "$ENVIRONMENT" ] || [ "$ENVIRONMENT" = "$PIPELINE_NAME" ]; then
  ENVIRONMENT="Unknown"
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CHANGELOG="Pipeline: ${PIPELINE_NAME} | Environment: ${ENVIRONMENT} | Branch: ${BRANCH} | Timestamp: ${TIMESTAMP}"

echo "Pipeline: $PIPELINE_NAME"
echo "Changelog: $CHANGELOG"

# Change to ios directory where fastlane folder is located
cd ios

MAX_UPLOAD_ATTEMPTS="${TESTFLIGHT_UPLOAD_MAX_ATTEMPTS:-3}"
BASE_RETRY_DELAY_SECONDS="${TESTFLIGHT_UPLOAD_RETRY_DELAY_SECONDS:-30}"
ATTEMPT=1

while [ "$ATTEMPT" -le "$MAX_UPLOAD_ATTEMPTS" ]; do
  echo "TestFlight upload attempt ${ATTEMPT}/${MAX_UPLOAD_ATTEMPTS}"

  if bundle exec fastlane upload_to_testflight_only \
    ipa_path:"$IPA_PATH" \
    groups:"$TESTFLIGHT_GROUP" \
    changelog:"$CHANGELOG" \
    distribute_external:"$DISTRIBUTE_EXTERNAL"; then
    echo "✅ TestFlight upload succeeded on attempt ${ATTEMPT}/${MAX_UPLOAD_ATTEMPTS}"
    break
  fi

  if [ "$ATTEMPT" -eq "$MAX_UPLOAD_ATTEMPTS" ]; then
    echo "❌ TestFlight upload failed after ${MAX_UPLOAD_ATTEMPTS} attempts."
    exit 1
  fi

  SLEEP_SECONDS=$((BASE_RETRY_DELAY_SECONDS * ATTEMPT))
  echo "⚠️ Upload failed, retrying in ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
  ATTEMPT=$((ATTEMPT + 1))
done
