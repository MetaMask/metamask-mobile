#!/bin/bash
set -euo pipefail

# Parse arguments
PLATFORM="${1:-}"
BUILD_ACTION="${2:-}"
ARTIFACT_PATH="${3:-}"
PR_NUMBER="${4:-main}"

# Validate required arguments
[[ -z "$PLATFORM" || -z "$BUILD_ACTION" ]] && { echo "Usage: $0 <platform> <build_action> [artifact_path] [pr_number]"; exit 1; }

# Helper function to set outputs
set_outputs() {
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "build_method=$1" >> "$GITHUB_OUTPUT"
        echo "can_repack=$2" >> "$GITHUB_OUTPUT"
        echo "cache_hit=$3" >> "$GITHUB_OUTPUT"
    fi
}

# Helper function to check artifact validity
check_artifact() {
    local path="$1"
    [[ -z "$path" ]] && return 1
    
    if [[ "$PLATFORM" == "android" ]]; then
        [[ -f "$path" ]] && [[ $(stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo "0") -gt 1000000 ]]
    else
        [[ -d "$path" ]] && [[ $(du -sb "$path" 2>/dev/null | cut -f1 || echo "0") -gt 10000000 ]]
    fi
}

# Main logic
case "$BUILD_ACTION" in
    "skip")
        set_outputs "skip" "false" "false"
        ;;
    "full")
        set_outputs "full" "false" "false"
        ;;
    "check_fingerprint")
        if check_artifact "$ARTIFACT_PATH"; then
            echo "Found cached artifacts for current fingerprint"
            set_outputs "repack" "true" "true"
        else
            echo "No cached artifacts found for current fingerprint"
            set_outputs "full" "false" "false"
        fi
        ;;
    *)
        set_outputs "full" "false" "false"
        ;;
esac