#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
# TEST_SUITE_TAG=".*SmokeEarn.*"

# If E2E_TEST_FILE is set, use it directly
if [[ -n "${E2E_TEST_FILE:-}" ]]; then
    if [[ -z "$E2E_TEST_FILE" ]]; then
        echo "[ERROR] E2E_TEST_FILE is set but empty. Please provide a valid file path or comma-separated list of files."
        exit 1
    fi
    echo "E2E_TEST_FILE is set: $E2E_TEST_FILE"
    # Support comma-separated list of files
    IFS=',' read -ra FILES <<< "$E2E_TEST_FILE"
    TEST_FILES="${FILES[*]}"
    # Check that all files exist
    for file in "${FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            echo "[ERROR] Specified test file does not exist: $file"
            exit 1
        fi
    done
    echo -e "\nRunning specified test file(s): $TEST_FILES"
else
    echo "Searching for tests with pattern: $TEST_SUITE_TAG"

    # Initialize an array to store matching files
    declare -a matching_files

    # Find matching files and store them in the array
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            matching_files+=("$file")
            echo "Found matching test: $file"
        fi
    done < <(find "$BASE_DIR" -type f \( -name "*.spec.js" -o -name "*.spec.ts" \) -exec grep -l "$TEST_SUITE_TAG" {} \; | sort -u)

    # Check if any files were found
    if [ ${#matching_files[@]} -eq 0 ]; then
        echo "[ERROR] No test files found containing pattern: $TEST_SUITE_TAG"
        exit 1
    fi

    # Display results
    echo -e "\n Found ${#matching_files[@]} matching test files:"
    printf '%s\n' "${matching_files[@]}" | sed 's/^/  - /'

    # Join array elements with spaces to pass to test command
    TEST_FILES="${matching_files[*]}"
    echo -e "\nRunning matching tests..."
fi

# Run all matching tests in a single command
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    echo "Detected iOS workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:run:qa-release $TEST_FILES
else
    echo "Detected Android workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:qa-release $TEST_FILES
fi