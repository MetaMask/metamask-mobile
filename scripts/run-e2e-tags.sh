#!/usr/bin/env bash

# Set strict error handling
set -euo pipefail

# Constants
BASE_DIR="./e2e/specs"
# TEST_SUITE_TAG=".*SmokeEarn.*"

# Sharding configuration
TOTAL_SHARDS=${TOTAL_SHARDS:-1}
SHARD_INDEX=${SHARD_INDEX:-1}

echo "Searching for tests with pattern: $TEST_SUITE_TAG"
if [[ $TOTAL_SHARDS -gt 1 ]]; then
    echo "Sharding enabled: Running shard $SHARD_INDEX of $TOTAL_SHARDS"
fi

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

# Function to shard files
shard_files() {
    local total_files=${#matching_files[@]}
    local -a shard_files=()
    
    if [[ $TOTAL_SHARDS -eq 1 ]]; then
        # No sharding, keep all files
        return 0
    fi
    
    # Calculate files per shard
    local files_per_shard=$((total_files / TOTAL_SHARDS))
    local remainder=$((total_files % TOTAL_SHARDS))
    
    # Calculate start and end indices for this shard
    local start_index=0
    for ((i=1; i<SHARD_INDEX; i++)); do
        local shard_size=$files_per_shard
        if [[ $i -le $remainder ]]; then
            ((shard_size++))
        fi
        ((start_index += shard_size))
    done
    
    local shard_size=$files_per_shard
    if [[ $SHARD_INDEX -le $remainder ]]; then
        ((shard_size++))
    fi
    
    local end_index=$((start_index + shard_size))
    
    # Extract files for this shard
    for ((i=start_index; i<end_index && i<total_files; i++)); do
        shard_files+=("${matching_files[i]}")
    done
    
    echo "Shard $SHARD_INDEX: files $((start_index + 1))-$end_index of $total_files total files"
    
    # Update the global array with shard files
    matching_files=("${shard_files[@]}")
}

# Display results
echo -e "\n Found ${#matching_files[@]} matching test files:"
printf '%s\n' "${matching_files[@]}" | sed 's/^/  - /'

# Apply sharding if enabled
if [[ $TOTAL_SHARDS -gt 1 ]]; then
    echo -e "\nApplying sharding..."
    shard_files
    
    echo -e "\nShard $SHARD_INDEX contains ${#matching_files[@]} files:"
    printf '%s\n' "${matching_files[@]}" | sed 's/^/  - /'
fi

# Check if any files remain after sharding
if [ ${#matching_files[@]} -eq 0 ]; then
    echo "No test files in shard $SHARD_INDEX"
    exit 0
fi

# Run all matching tests in a single command
echo -e "\nRunning matching tests..."

# Join array elements with spaces to pass to test command
TEST_FILES="${matching_files[*]}"
# yarn test:e2e:ios:debug:run $TEST_FILES
if [[ "$BITRISE_TRIGGERED_WORKFLOW_ID" == *"ios"* ]]; then
    echo "Detected iOS workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:ios:$METAMASK_BUILD_TYPE:prod $TEST_FILES
elif [[ "${GITHUB_CI}" == "true" || "${GITHUB_CI}" == "1" ]]; then
    echo "Detected GitHub Actions workflow - using GitHub CI configuration"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:run:github:qa-release $TEST_FILES
else
    echo "Detected Android workflow"
    IGNORE_BOXLOGS_DEVELOPMENT="true" \
    yarn test:e2e:android:$METAMASK_BUILD_TYPE:prod $TEST_FILES
fi
