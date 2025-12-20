#!/bin/bash

set -euo pipefail

METAMASK_WORKFLOW="pr_rc_rwy_pipeline"
GH_REF_NAME="release/${SEMVER}"

./scripts/set-build-version.sh $BUILD_NUMBER
git diff
git config user.name metamaskbot
git config user.email metamaskbot@users.noreply.github.com
git add bitrise.yml
git add package.json
git add ios/MetaMask.xcodeproj/project.pbxproj
git add android/app/build.gradle
git commit -m "[skip ci] Bump version number to ${BUILD_NUMBER}"
git push origin HEAD:$GH_REF_NAME --force-with-lease
COMMIT_HASH=$(git rev-parse HEAD)


BUILD_RESPONSE=$(curl -s -X POST \
  "https://app.bitrise.io/app/$BITRISE_APP_ID/build/start.json" \
  -H "Content-Type: application/json" \
  -d '{
    "build_params": {
      "branch": "'$GH_REF_NAME'",
      "pipeline_id": "'$METAMASK_WORKFLOW'",
      "commit_message": "RC build '${SEMVER}'('${BUILD_NUMBER}')",
      "commit_hash": "'$COMMIT_HASH'"
    },
    "hook_info": {
      "type": "bitrise",
      "build_trigger_token": "'$BITRISE_BUILD_TRIGGER_TOKEN'"
    },
    "triggered_by": "GitHub Actions RC Build"
  }')

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

ANDROID_ARTIFACTS=$(curl -s -H "Authorization: $BITRISE_API_TOKEN" \
  "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_ID/builds/$ANDROID_WORKFLOW_ID/artifacts")

ANDROID_ARTIFACT_ID=$(echo "$ANDROID_ARTIFACTS" | jq -r '.data | .[] | select(.is_public_page_enabled==true) | .slug')

ANDROID_APK=$(curl -s -H "Authorization: $BITRISE_API_TOKEN" \
  "https://api.bitrise.io/v0.1/apps/$BITRISE_APP_ID/builds/$ANDROID_WORKFLOW_ID/artifacts/$ANDROID_ARTIFACT_ID")
#
ANDROID_PUBLIC_URL=$(echo "$ANDROID_APK" | jq -r '.data.public_install_page_url')

echo "Pipeline ID: $BUILD_SLUG"
echo "Android build ID: $ANDROID_WORKFLOW_ID"
echo "iOS Build ID: $IOS_WORKFLOW_ID"
echo "Android public link: $ANDROID_PUBLIC_URL"
echo "Build number: $BUILD_NUMBER"

# Post Slack notification if bot token is configured (fail open - non-critical)
if [[ -n "${SLACK_BOT_TOKEN:-}" ]]; then
  echo ""
  echo "Posting Slack notification..."

  # Export variables for the TypeScript script
  export SEMVER
  export BUILD_NUMBER
  export ANDROID_PUBLIC_URL
  export BITRISE_PIPELINE_URL="https://app.bitrise.io/app/$BITRISE_APP_ID/pipelines/$BUILD_SLUG"
  export SLACK_BOT_TOKEN

  # Run the Slack notification script (fail open - don't fail the build if notification fails)
  if npx ts-node ./scripts/slack-rc-notification.ts; then
    echo "Slack notification sent successfully"
  else
    echo "⚠️ Slack notification failed, but continuing (non-critical)"
  fi
else
  echo ""
  echo "Skipping Slack notification (SLACK_BOT_TOKEN not set)"
fi
