#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
# Default values if not provided via environment variables
SPLIT_NUMBER=${SPLIT_NUMBER:-1}
TOTAL_SPLITS=${TOTAL_SPLITS:-1}

echo "Searching for tests with pattern: $TEST_SUITE_TAG"
echo "Running split $SPLIT_NUMBER of $TOTAL_SPLITS"

# Initialize an array to store matching files
declare -a matching_files

# Find matching files and store them in the array
while IFS= read -r file; do
    if [ -n "$file" ]; then
        matching_files+=("$file")
    fi
done < <(find "$BASE_DIR" -type f \( -name "*.spec.js" -o -name "*.spec.ts" \) -not -path "*/quarantine/*" -exec grep -l -w -F "$TEST_SUITE_TAG" {} \; | sort -u)

# Check if any files were found
if [ ${#matching_files[@]} -eq 0 ]; then
    echo "❌ No test files found containing pattern: $TEST_SUITE_TAG"
    exit 1
fi

# Display total results
echo -e "\n📋 Found ${#matching_files[@]} matching test files in total"

# Calculate which files belong to our split
TOTAL_FILES=${#matching_files[@]}
FILES_PER_SPLIT=$(( (TOTAL_FILES + TOTAL_SPLITS - 1) / TOTAL_SPLITS ))
START_INDEX=$(( (SPLIT_NUMBER - 1) * FILES_PER_SPLIT ))
END_INDEX=$(( START_INDEX + FILES_PER_SPLIT ))

# Ensure we don't go out of bounds
if [ $END_INDEX -gt $TOTAL_FILES ]; then
    END_INDEX=$TOTAL_FILES
fi

# Create array with only our split's files
declare -a split_files
for (( i=START_INDEX; i<END_INDEX; i++ )); do
    split_files+=("${matching_files[$i]}")
done

# Display split results
echo -e "\n🔍 Running ${#split_files[@]} tests for split $SPLIT_NUMBER of $TOTAL_SPLITS:"
printf '%s\n' "${split_files[@]}" | sed 's/^/  - /'

# Check if our split has any files
if [ ${#split_files[@]} -eq 0 ]; then
    echo "⚠️ No test files for this split"
    exit 0
fi

# Run tests for our split
echo -e "\n🚀 Running matching tests for split $SPLIT_NUMBER..."

# Join array elements with spaces to pass to test command
TEST_FILES="${split_files[*]}"

# Determine platform and environment
IS_IOS_WORKFLOW="false"
IS_GITHUB_CI="false"

if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    IS_IOS_WORKFLOW="true"
fi

if [[ -n "${GITHUB_CI:-}" ]]; then
    IS_GITHUB_CI="true"
fi

# Run tests based on platform and environment
if [[ "$IS_IOS_WORKFLOW" == "true" ]] && [[ "$IS_GITHUB_CI" == "true" ]]; then
    echo "🍎 Running iOS tests on GitHub Actions"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios-gha:$METAMASK_BUILD_TYPE:prod $TEST_FILES
elif [[ "$IS_IOS_WORKFLOW" == "true" ]]; then
    echo "🍎 Running iOS tests on Bitrise"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:$METAMASK_BUILD_TYPE:prod $TEST_FILES
elif [[ "$IS_GITHUB_CI" == "true" ]]; then
    echo "🤖 Running Android tests on GitHub Actions"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:github:qa-release $TEST_FILES
else
    echo "🤖 Running Android tests on Bitrise"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:$METAMASK_BUILD_TYPE:prod $TEST_FILES
fi
