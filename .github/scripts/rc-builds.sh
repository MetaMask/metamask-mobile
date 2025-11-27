#!/bin/bash

set -euo pipefail

./scripts/set-build-version.sh $BUILD_NUMBER
# git diff
#git config user.name metamaskbot
#git config user.email metamaskbot@users.noreply.github.com
git add bitrise.yml
git add package.json
git add ios/MetaMask.xcodeproj/project.pbxproj
git add android/app/build.gradle
#git commit -m "[skip ci] Bump version number to ${{ needs.generate-build-version.outputs.build-version }}"
#git push origin HEAD:release/$SEMVER --force-with-lease
COMMIT_HASH=$(git rev-parse HEAD)
echo $COMMIT_HASH



          BUILD_RESPONSE=$(curl -s -X POST \
            "https://app.bitrise.io/app/$BITRISE_APP_ID/build/start.json" \
            -H "Content-Type: application/json" \
            -d '{
              "build_params": {
                "branch": "${GH_REF_NAME}",
                "workflow_id": "${{ env.METAMASK_WORKFLOW }}",
                "commit_message": "RC build",
                "commit_hash": ${{ COMMIT_HASH }}
                "environments": '"$ENV_VARS"',
                "custom_id": "'"$CUSTOM_ID"'"
              },
              "hook_info": {
                "type": "bitrise",
                "build_trigger_token": "'"$BITRISE_BUILD_TRIGGER_TOKEN"'"
              },
              "triggered_by": "GitHub Actions RC Build"
            }')

          echo "Build response: $BUILD_RESPONSE"


$github.ref_name = GH_REF_NAME
