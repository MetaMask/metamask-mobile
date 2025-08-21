#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
# TEST_SUITE_TAG=".*SmokeCard.*"

# Testing only!
if [[ "$TEST_SUITE_TAG" != *"SmokeCard"* ]]; then
    echo "Skipping: TEST_SUITE_TAG does not contain 'SmokeCard'. FOR TESTING"
    exit 0
fi


# Optional PR context (can be provided via args or env)
IS_PR="${IS_PR:-false}"
PR_BASE_REF="${PR_BASE_REF:-origin/main}"
PR_BASE_SHA="${PR_BASE_SHA:-}"

# Parse optional CLI arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --is-pr)
            IS_PR="$2"
            shift 2
            ;;
        --pr-base-ref)
            PR_BASE_REF="$2"
            shift 2
            ;;
        --pr-base-sha)
            PR_BASE_SHA="$2"
            shift 2
            ;;
        *)
            # Keep backward compatibility
            shift
            ;;
    esac
done

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

# Detect newly added test files on PRs and duplicate them in the run list
# This only runs on PRs, not on main runs
declare -a new_tests
if [[ "$IS_PR" == "true" ]]; then
    echo "PR context detected. Checking for newly added tests to duplicate..."

    # Sets the base ref to the PR base ref if not provided
    if [[ -z "$PR_BASE_SHA" && -n "$PR_BASE_REF" ]]; then
        if ! git rev-parse --verify "$PR_BASE_REF" >/dev/null 2>&1; then
            # Attempt to fetch the base ref; ignore failures to avoid breaking the run
            git fetch --depth=1000 origin "$PR_BASE_REF" || true
        fi
    fi

    # Determine base point for diff
    base_ref=""
    if [[ -n "$PR_BASE_SHA" ]]; then
        base_ref="$PR_BASE_SHA"
    else
        if git rev-parse --verify "$PR_BASE_REF" >/dev/null 2>&1; then
            base_ref=$(git merge-base HEAD "$PR_BASE_REF" 2>/dev/null || echo "")
        fi
    fi

    if [[ -n "$base_ref" ]]; then
        # List files Added (A) between base and HEAD, then filter to spec files under e2e/specs
        add_list=$(git diff --diff-filter=A --name-only "$base_ref"...HEAD 2>/dev/null || true)
        while IFS= read -r added_file; do
            if [[ -n "$added_file" ]] && [[ "$added_file" =~ ^e2e/specs/.*\.spec\.(js|ts)$ ]]; then
                # Normalize to match the leading "./" from find output
                new_tests+=("./$added_file")
            fi
        done < <(echo "$add_list")
        if [ ${#new_tests[@]} -gt 0 ]; then
            echo "Newly added tests detected:";
            printf '%s\n' "${new_tests[@]}" | sed 's/^/  - /'
        else
            echo "No newly added tests detected."
        fi
    else
        echo "Could not determine base ref for PR; skipping new test duplication."
    fi
fi

# Build final test list, duplicating any newly added tests
declare -a final_files
for file in "${matching_files[@]}"; do
    final_files+=("$file")
    if [[ "$IS_PR" == "true" && ${#new_tests[@]} -gt 0 ]]; then
        for n in "${new_tests[@]}"; do
            if [[ "$file" == "$n" ]]; then
                final_files+=("$file")
                echo "Duplicating newly added test: $file"
                break
            fi
        done
    fi
done

# Display results
echo -e "\n Found ${#matching_files[@]} matching test files:"
printf '%s\n' "${matching_files[@]}" | sed 's/^/  - /'

if [ ${#final_files[@]} -ne ${#matching_files[@]} ]; then
    echo -e "\n Final test files after duplication (count: ${#final_files[@]}):"
    printf '%s\n' "${final_files[@]}" | sed 's/^/  - /'
fi

# Run all matching tests in a single command
echo -e "\nRunning matching tests..."

# Join array elements with spaces to pass to test command
TEST_FILES="${final_files[*]}"
# yarn test:e2e:ios:debug:run $TEST_FILES
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    echo "Detected iOS workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:$METAMASK_BUILD_TYPE:prod $TEST_FILES
elif [[ -n "${GITHUB_CI:-}" ]]; then
    echo "Detected GitHub Actions workflow - using GitHub CI configuration"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:github:qa-release $TEST_FILES
else
    echo "Detected Android workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:$METAMASK_BUILD_TYPE:prod $TEST_FILES
fi
