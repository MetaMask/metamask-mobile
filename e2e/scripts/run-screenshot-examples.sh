#!/bin/bash

# Script to run screenshot examples E2E tests locally
# Usage: ./e2e/scripts/run-screenshot-examples.sh [ios|android]

set -e

PLATFORM="${1:-ios}"
TEST_TAG="ScreenshotExamples:"

echo "🧪 Running Screenshot Examples E2E Tests"
echo "Platform: $PLATFORM"
echo "Test Tag: $TEST_TAG"
echo ""

# Set environment variable
export TEST_SUITE_TAG="$TEST_TAG"

# Clean previous test artifacts
echo "🧹 Cleaning previous test artifacts..."
rm -rf e2e/artifacts/*

# Run tests based on platform
if [ "$PLATFORM" = "ios" ]; then
  echo "📱 Running tests on iOS..."
  yarn test:e2e:ios --testNamePattern="$TEST_TAG"
elif [ "$PLATFORM" = "android" ]; then
  echo "📱 Running tests on Android..."
  yarn test:e2e:android --testNamePattern="$TEST_TAG"
else
  echo "❌ Invalid platform: $PLATFORM"
  echo "Usage: $0 [ios|android]"
  exit 1
fi

# Show artifacts location
echo ""
echo "✅ Tests complete!"
echo ""
echo "📸 Screenshots saved to:"
if [ "$PLATFORM" = "ios" ]; then
  echo "   e2e/artifacts/ios.sim.debug.MetaMask/"
else
  echo "   e2e/artifacts/android.emu.debug.MetaMask/"
fi
echo ""
echo "To view screenshots, check the artifacts directory above."

