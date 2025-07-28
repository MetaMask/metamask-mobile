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
done < <(find "$BASE_DIR" -type f \( -name "*.spec.js" -o -name "*.spec.ts" \) -not -path "*/quarantine/*" -exec grep -l "$TEST_SUITE_TAG" {} \; | sort -u)

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

# Debug: Show exactly what files will be passed to Jest
echo "🔍 Debug: Files being passed to Jest:"
printf '  - %s\n' "${matching_files[@]}"
echo "🔍 Debug: Total files: ${#matching_files[@]}"

# Pass array elements directly as separate arguments (proper shell array expansion)
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    echo "Detected iOS workflow"
    echo "🚀 Executing: yarn test:e2e:ios:run:qa-release ${matching_files[*]}"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:run:qa-release "${matching_files[@]}"
else
    echo "Detected Android workflow" 
    echo "🚀 Executing: yarn test:e2e:android:run:qa-release ${matching_files[*]}"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:qa-release "${matching_files[@]}"
fi

# Debug: Show what files were generated after test execution
echo -e "\n🔍 Debug: Files in e2e/reports after test execution:"
ls -la e2e/reports/ 2>/dev/null || echo "No reports directory found"

echo -e "\n✅ Test execution completed. Jest-junit should have created junit.xml with all test results."
