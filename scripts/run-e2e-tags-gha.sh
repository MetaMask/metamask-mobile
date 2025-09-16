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

# Track any temporary duplicated files for cleanup at exit
declare -a created_copies
cleanup_created_copies() {
    if (( ${#created_copies[@]} > 0 )); then
        echo -e "\n🧹 Cleaning up ${#created_copies[@]} temporary duplicated test files..."
        for tmpf in "${created_copies[@]}"; do
            [[ -f "$tmpf" ]] && rm -f "$tmpf" || true
        done
    fi
}
trap cleanup_created_copies EXIT

# If running in a PR, detect newly added spec files (not present on main) among this split
IS_PR_CONTEXT="false"
if [[ -n "${PR_NUMBER:-}" ]] || [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]] || [[ "${GITHUB_REF:-}" == refs/pull/* ]]; then
    IS_PR_CONTEXT="true"
fi

if [[ "$IS_PR_CONTEXT" == "true" ]]; then
    echo -e "\n🔎 PR context detected. Checking for new spec files vs main..."

    # Ensure we have a reference to main
    BASE_REF="origin/main"
    if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
        git fetch origin main --depth=1 >/dev/null 2>&1 || true
    fi

    if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
        MERGE_BASE="$(git merge-base HEAD "$BASE_REF" 2>/dev/null || true)"
        if [[ -z "$MERGE_BASE" ]]; then
            MERGE_BASE="$BASE_REF"
        fi

        # Build a list of changed spec files in the PR compared to main
        declare -a changed_specs
        while IFS= read -r line; do
            # Filter to spec files under e2e/specs
            if [[ "$line" =~ ^e2e/specs/.*\.spec\.(ts|js)$ ]]; then
                changed_specs+=("$line")
            fi
        done < <(git diff --name-only "$MERGE_BASE"...HEAD || true)

        # List of new spec files (not present on main)
        declare -a new_specs
        for f in "${changed_specs[@]}"; do
            if ! git cat-file -e "$BASE_REF:$f" 2>/dev/null; then
                new_specs+=("$f")
            fi
        done

        # Helper to check if a value is contained within an array
        is_in_array() {
            local needle="$1"; shift
            local element
            for element in "$@"; do
                if [[ "$element" == "$needle" ]]; then
                    return 0
                fi
            done
            return 1
        }

        # Augment split_files with duplicates for new tests
        if (( ${#new_specs[@]} > 0 )); then
            declare -a augmented_files
            for f in "${split_files[@]}"; do
                augmented_files+=("$f")
                # Normalize path by stripping leading './' for comparison with git diff outputs
                f_norm="${f#./}"
                if is_in_array "$f_norm" "${new_specs[@]}"; then
                    dir="${f%/*}"
                    base="$(basename "$f")"
                    name="${base%.spec.ts}"
                    ext=".spec.ts"
                    if [[ "$f" == *.spec.js ]]; then
                        name="${base%.spec.js}"
                        ext=".spec.js"
                    fi
                    copy1="$dir/${name}-retry-1$ext"
                    copy2="$dir/${name}-retry-2$ext"
                    cp "$f" "$copy1"
                    cp "$f" "$copy2"
                    created_copies+=("$copy1" "$copy2")
                    augmented_files+=("$copy1" "$copy2")
                    echo "🧪 New test detected, duplicating for flakiness check: $f -> $copy1, $copy2"
                fi
            done
            # Replace split_files with augmented list
            split_files=("${augmented_files[@]}")
        fi
    else
        echo "⚠️ Could not verify origin/main. Skipping new test duplication."
    fi
fi

# Display split results (after potential augmentation)
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
