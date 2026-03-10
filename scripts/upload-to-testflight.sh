#!/usr/bin/env bash

# Upload IPA to TestFlight via Fastlane
# This script can be used in both Bitrise and GitHub Actions workflows
#
# Usage:
#   ./scripts/upload-to-testflight.sh <pipeline_name> <branch> [ipa_path] [testflight_group]
#
# Arguments:
#   pipeline_name    - Pipeline or workflow name (required)
#   branch           - Git branch name (required)
#   ipa_path         - Optional: Direct path to IPA file (if not provided, uses find-ipa-file.sh)
#   testflight_group - Optional: TestFlight external testing group name (default: MetaMask BETA & Release Candidates)
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
# Bitrise and others pass pipeline title; use first segment before underscore.
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

bundle exec fastlane upload_to_testflight_only \
  ipa_path:"$IPA_PATH" \
  groups:"$TESTFLIGHT_GROUP" \
  changelog:"$CHANGELOG"

