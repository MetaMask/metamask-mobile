#!/bin/bash
#
# Single source of truth for reading build metadata from the repo tree.
# Outputs are written to GITHUB_OUTPUT when running in CI, or printed to
# stdout for local debugging.
#
# Usage:
#   scripts/get-build-metadata.sh          # all fields
#   scripts/get-build-metadata.sh --ci     # same, but fail if GITHUB_OUTPUT is unset
#
# Outputs (GITHUB_OUTPUT keys):
#   android_version_code  - versionCode from android/app/build.gradle
#   ios_version_code      - CURRENT_PROJECT_VERSION from ios/MetaMask.xcodeproj/project.pbxproj
#   semantic_version      - version from package.json
#
set -euo pipefail

ANDROID_VERSION_CODE=$(awk '/versionCode[[:space:]]/{print $2; exit}' android/app/build.gradle | tr -d '\r')
IOS_VERSION_CODE=$(sed -n 's/.*CURRENT_PROJECT_VERSION = \([0-9][0-9]*\);/\1/p' ios/MetaMask.xcodeproj/project.pbxproj | head -1)
SEMANTIC_VERSION=$(node -p "require('./package.json').version")

echo "android_version_code=$ANDROID_VERSION_CODE"
echo "ios_version_code=$IOS_VERSION_CODE"
echo "semantic_version=$SEMANTIC_VERSION"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "android_version_code=$ANDROID_VERSION_CODE"
    echo "ios_version_code=$IOS_VERSION_CODE"
    echo "semantic_version=$SEMANTIC_VERSION"
  } >> "$GITHUB_OUTPUT"
elif [[ "${1:-}" == "--ci" ]]; then
  echo "::error::GITHUB_OUTPUT is not set — cannot emit step outputs" >&2
  exit 1
fi
