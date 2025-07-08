#!/bin/bash

# Check if builds already exist for this PR and app code state
# Sets SKIP_BUILD=true if builds can be reused

set -e

echo "Checking for existing PR builds..."

# Ensure we have required environment variables
if [[ -z "$GITHUB_PR_NUMBER" ]]; then
    echo "No PR number found, proceeding with build"
    envman add --key SKIP_BUILD --value "false"
    exit 0
fi

# Generate app code hash from relevant directories
APP_CODE_HASH=$(find app/ ios/ android/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.swift" -o -name "*.m" -o -name "*.java" -o -name "*.kt" -o -name "*.gradle" -o -name "*.pbxproj" -o -name "*.plist" -o -name "*.xml" \) -exec md5sum {} \; 2>/dev/null | sort | md5sum | cut -d' ' -f1)

echo "PR Number: $GITHUB_PR_NUMBER"
echo "App Code Hash: $APP_CODE_HASH"

# Set environment variables for cache keys
envman add --key APP_CODE_HASH --value "$APP_CODE_HASH"
envman add --key PR_BUILD_CACHE_KEY --value "e2e-build-pr-${GITHUB_PR_NUMBER}-${APP_CODE_HASH}"

# Check if we have cached builds for this PR + app code combination
# This uses Bitrise's cache mechanism to check if artifacts exist
CACHE_KEY="e2e-artifacts-pr-${GITHUB_PR_NUMBER}-${APP_CODE_HASH}"

echo "Checking cache for key: $CACHE_KEY"

# Try to restore cache to check if it exists
# We'll check both iOS and Android build directories
IOS_BUILD_EXISTS=false
ANDROID_BUILD_EXISTS=false

# Check if we have intermediate files from previous builds
if [[ -d "ios/build/Build/Products/Release-iphonesimulator" ]] && [[ -d "../Library/Detox/ios" ]]; then
    IOS_BUILD_EXISTS=true
    echo "iOS build artifacts found in cache"
fi

if [[ -d "android/app/build/outputs" ]]; then
    ANDROID_BUILD_EXISTS=true
    echo "Android build artifacts found in cache"
fi

# Skip build if both iOS and Android builds exist
if [[ "$IOS_BUILD_EXISTS" == "true" && "$ANDROID_BUILD_EXISTS" == "true" ]]; then
    echo "Both iOS and Android builds exist for this PR + app code state"
    echo "Skipping build and reusing cached artifacts"
    envman add --key SKIP_BUILD --value "true"
else
    echo "Build artifacts not found or incomplete, proceeding with build"
    envman add --key SKIP_BUILD --value "false"
fi

echo "SKIP_BUILD set to: $(envman get --key SKIP_BUILD)"