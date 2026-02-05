#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./tests/smoke"
# TEST_SUITE_TAG=".*SmokeEarn.*"

echo "Searching for tests with pattern: $TEST_SUITE_TAG"

GITHUB_CI=${GITHUB_CI:-false}

# Determine grep options based on environment - The GHA test suites have deterministic Tags
if [[ "${GITHUB_CI}" == "true" || "${GITHUB_CI}" == "1" ]]; then
    GREP_OPTS="-l -w -F"
else
    GREP_OPTS="-l"
fi

# Initialize an array to store matching files
declare -a matching_files

# Find matching files and store them in the array
while IFS= read -r file; do
    if [ -n "$file" ]; then
        matching_files+=("$file")
        echo "Found matching test: $file"
    fi
done < <(find "$BASE_DIR" -type f \( -name "*.spec.js" -o -name "*.spec.ts" \) -not -path "*/quarantine/*" -exec grep $GREP_OPTS "$TEST_SUITE_TAG" {} \; | sort -u)

# Check if any files were found
if [ ${#matching_files[@]} -eq 0 ]; then
    echo " No test files found containing pattern: $TEST_SUITE_TAG"
    exit 1
fi

# Display results
echo -e "\n Found ${#matching_files[@]} matching test files:"
printf '%s\n' "${matching_files[@]}" | sed 's/^/  - /'

# Run all matching tests in a single command
echo -e "\nRunning matching tests..."


# Join array elements with spaces to pass to test command
TEST_FILES="${matching_files[*]}"
# yarn test:e2e:ios:debug:run $TEST_FILES
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    echo "Detected iOS workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:$METAMASK_BUILD_TYPE:ci $TEST_FILES
else
    echo "Detected Android workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:$METAMASK_BUILD_TYPE:ci $TEST_FILES
fi
