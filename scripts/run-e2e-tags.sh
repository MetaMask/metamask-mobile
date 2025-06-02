#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
# TEST_SUITE_TAG=".*SmokeEarn.*"

echo "Searching for tests with pattern: $TEST_SUITE_TAG"

# Initialize an array to store matching files
declare -a matching_files

# Find matching files and store them in the array
while IFS= read -r file; do
    if [ -n "$file" ]; then
        matching_files+=("$file")
        echo "Found matching test: $file"
    fi
done < <(find "$BASE_DIR" -type f -name "*.spec.js" -exec grep -l "$TEST_SUITE_TAG" {} \; | sort -u)

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
    yarn test:e2e:ios:run:qa-release $TEST_FILES
else
    echo "Detected Android workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:qa-release $TEST_FILES
fi