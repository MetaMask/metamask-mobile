#!/bin/bash

set -euo pipefail

# Validate required environment variables
: "${SEMVER:?SEMVER environment variable must be set}"
: "${BUILD_NUMBER:?BUILD_NUMBER environment variable must be set}"
: "${BITRISE_APP_ID:?BITRISE_APP_ID environment variable must be set}"
: "${BITRISE_BUILD_TRIGGER_TOKEN:?BITRISE_BUILD_TRIGGER_TOKEN environment variable must be set}"
: "${BITRISE_API_TOKEN:?BITRISE_API_TOKEN environment variable must be set}"
: "${COMMIT_HASH:?COMMIT_HASH environment variable must be set}"
: "${GH_REF_NAME:?GH_REF_NAME environment variable must be set}"

# Additional validation for semver format
if ! [[ "${SEMVER:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: SEMVER must be numeric X.Y.Z format, got: ${SEMVER:-<empty>}" >&2
  exit 1
fi

METAMASK_WORKFLOW="pr_rc_rwy_pipeline"

# Use jq to safely construct JSON payload
JSON_PAYLOAD=$(jq -n \
  --arg branch "$GH_REF_NAME" \
  --arg pipeline_id "$METAMASK_WORKFLOW" \
  --arg commit_message "RC build ${SEMVER}(${BUILD_NUMBER})" \
  --arg commit_hash "$COMMIT_HASH" \
  --arg build_trigger_token "$BITRISE_BUILD_TRIGGER_TOKEN" \
  '{
    "build_params": {
      "branch": $branch,
      "pipeline_id": $pipeline_id,
      "commit_message": $commit_message,
      "commit_hash": $commit_hash
    },
    "hook_info": {
      "type": "bitrise",
      "build_trigger_token": $build_trigger_token
    },
    "triggered_by": "GitHub Actions RC Build"
  }')

BUILD_RESPONSE=$(curl -s -X POST \
  "https://app.bitrise.io/app/$BITRISE_APP_ID/build/start.json" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

echo "Build response: $BUILD_RESPONSE"
BUILD_SLUG=$(echo "$BUILD_RESPONSE" | jq -r '.build_slug')
echo "Build slug: $BUILD_SLUG"

if [[ -z "$BUILD_SLUG" || "$BUILD_SLUG" == "null" ]]; then
  echo "Error: Failed to get build slug"
  echo "Full response: $BUILD_RESPONSE"
  exit 1
fi

# Wait for the workflow to complete
echo "Waiting for $METAMASK_WORKFLOW to complete..."
TIMEOUT=2400  # 40 minutes
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  BUILD_RESPONSE=$(curl -s -H "Authorization: $BITRISE_API_TOKEN" \
    "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_ID/pipelines/$BUILD_SLUG")

  BUILD_STATUS=$(echo "$BUILD_RESPONSE" | jq -r '.status')
  echo "Build status: $BUILD_STATUS (elapsed: ${ELAPSED}s)"

  # Check for successful completion (status 1 or success/succeeded)
  if [ "$BUILD_STATUS" = "1" ] || [ "$BUILD_STATUS" = "success" ] || [ "$BUILD_STATUS" = "succeeded" ]; then
    echo "Build completed successfully"
    break
  elif [ "$BUILD_STATUS" = "0" ] || [ "$BUILD_STATUS" = "in_progress" ] || [ "$BUILD_STATUS" = "running" ]; then
    echo "Build is in progress..."
  elif [ "$BUILD_STATUS" = "2" ] || [ "$BUILD_STATUS" = "failed" ] || [ "$BUILD_STATUS" = "aborted" ]; then
    echo "Build failed with status: $BUILD_STATUS"
    exit 1
  elif [ "$BUILD_STATUS" = "initializing" ]; then
    echo "Build has started..."
  else
    echo "Unknown build status: $BUILD_STATUS"
  fi

  sleep 30
  ELAPSED=$((ELAPSED + 30))
done

if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
  echo "Timeout waiting for build to complete"
  echo "Final build status: $BUILD_STATUS"
  echo "Build slug: $BUILD_SLUG"
  exit 1
fi

# Android workflow slug
ANDROID_WORKFLOW_ID=$(echo "$BUILD_RESPONSE" | jq -r '.workflows | .[] | select(.name=="build_android_rc_and_upload_sourcemaps") | .external_id')
IOS_WORKFLOW_ID=$(echo "$BUILD_RESPONSE" | jq -r '.workflows | .[] | select(.name=="build_ios_rc_and_upload_sourcemaps") | .external_id')

if [[ -z "$ANDROID_WORKFLOW_ID" || "$ANDROID_WORKFLOW_ID" == "null" ]]; then
  echo "Error: Failed to get Android workflow ID"
  exit 1
fi

if [[ -z "$IOS_WORKFLOW_ID" || "$IOS_WORKFLOW_ID" == "null" ]]; then
  echo "Error: Failed to get iOS workflow ID"
  exit 1
fi
ANDROID_ARTIFACTS=$(curl -s -H "Authorization: $BITRISE_API_TOKEN" \
  "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_ID/builds/$ANDROID_WORKFLOW_ID/artifacts")

ANDROID_ARTIFACT_ID=$(echo "$ANDROID_ARTIFACTS" | jq -r '.data | .[] | select(.is_public_page_enabled==true) | .slug')

if [[ -z "$ANDROID_ARTIFACT_ID" || "$ANDROID_ARTIFACT_ID" == "null" ]]; then
  echo "Warning: No public Android artifact found"
  ANDROID_PUBLIC_URL="N/A"
else
  ANDROID_APK=$(curl -s -H "Authorization: $BITRISE_API_TOKEN" \
    "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_ID/builds/$ANDROID_WORKFLOW_ID/artifacts/$ANDROID_ARTIFACT_ID")
  ANDROID_PUBLIC_URL=$(echo "$ANDROID_APK" | jq -r '.data.public_install_page_url')
fi
echo "Pipeline ID: $BUILD_SLUG"
echo "Android build ID: $ANDROID_WORKFLOW_ID"
echo "iOS Build ID: $IOS_WORKFLOW_ID"
echo "Android public link: $ANDROID_PUBLIC_URL"
echo "Build number: $BUILD_NUMBER"
