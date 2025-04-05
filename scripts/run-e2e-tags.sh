#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
TEST_SUITE_TAG=".*SmokeEarn.*"

echo "Searching for tests with pattern: $TEST_SUITE_TAG"

# Create temporary directories for each test type
TEMP_TEST_DIR="$BASE_DIR/$TEST_SUITE_TAG"
rm -rf "$TEMP_TEST_DIR" # Clean up any existing directory first
mkdir -p "$TEMP_TEST_DIR"
echo "Created temporary directory: $TEMP_TEST_DIR"

# Find matching files and store them in a variable
matching_files=$(find "$BASE_DIR" -type f -name "*.spec.js" -exec grep -l "$TEST_SUITE_TAG" {} \; | sort -u)

# Check if any files were found
if [ -z "$matching_files" ]; then
    echo "❌ No test files found containing pattern: $TEST_SUITE_TAG"
    rm -rf "$TEMP_TEST_DIR"
    exit 1
fi

# Copy unique files to temp directory
while IFS= read -r file; do
    if [ -n "$file" ]; then
        filename=$(basename "$file")
        cp -f "$file" "$TEMP_TEST_DIR/"
        echo "✓ Copied: $filename"
    fi
done <<< "$matching_files"

# Display results
echo -e "\n✅ Test files ready in temporary directory:"
find "$TEMP_TEST_DIR" -type f -name "*.spec.js" | sed 's/^/  - /'

# Run all matching tests in a single command
echo -e "\nRunning matching tests..."
# Determine platform-specific test command
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == "ios_e2e_test" ]]; then
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:run:qa-release "$TEMP_TEST_DIR"
else
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:qa-release "$TEMP_TEST_DIR"
fi
# Cleanup
echo -e "\nCleaning up temporary directory..."
rm -rf "$TEMP_TEST_DIR"