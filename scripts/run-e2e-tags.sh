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

# On PRs, create physical "-retest" copies for newly added tests so Jest treats them as separate files
declare -a retest_files
if [[ "$IS_PR" == "true" && ${#new_tests[@]} -gt 0 ]]; then
    for file in "${matching_files[@]}"; do
        for n in "${new_tests[@]}"; do
            if [[ "$file" == "$n" ]]; then
                # Compute retest file path by inserting -retest before .spec.(ts|js)
                if [[ "$file" =~ \.spec\.ts$ ]]; then
                    retest_file="${file%.spec.ts}-retest.spec.ts"
                elif [[ "$file" =~ \.spec\.js$ ]]; then
                    retest_file="${file%.spec.js}-retest.spec.js"
                else
                    # Not expected, skip
                    continue
                fi

                # Create/overwrite retest file content
                cp "$file" "$retest_file"
                echo "Created retest copy: $retest_file"
                retest_files+=("$retest_file")
                break
            fi
        done
    done
fi

# Ensure we clean up retest files on exit
if [[ ${#retest_files[@]} -gt 0 ]]; then
    cleanup_retests() {
        # Delete only expected retest files within e2e/specs using a constrained find -exec
        find ./e2e/specs \
            -type f \
            \( -name "*-retest.spec.ts" -o -name "*-retest.spec.js" \) \
            -print \
            -exec rm -f -- {} + 2>/dev/null || true
    }
    trap cleanup_retests EXIT
fi

# Build final test list: originals + any retest copies
declare -a final_files
final_files=("${matching_files[@]}" "${retest_files[@]}")

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
