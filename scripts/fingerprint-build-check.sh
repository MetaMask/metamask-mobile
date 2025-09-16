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
        if [[ ! -f ".app-native-fingerprint" ]]; then
            set_outputs "full" "false" "false"
            exit 0
        fi
        
        SAVED_FP=$(cat .app-native-fingerprint)
        CURRENT_FP=$(yarn -s fingerprint:generate 2>/dev/null || echo "")
        
        if [[ -z "$CURRENT_FP" ]]; then
            set_outputs "full" "false" "false"
            exit 0
        fi
        
        if yarn fingerprint:check; then
            if check_artifact "$ARTIFACT_PATH"; then
                set_outputs "repack" "true" "true"
            else
                set_outputs "full" "false" "false"
            fi
        else
            set_outputs "full" "false" "false"
        fi
        ;;
    *)
        set_outputs "full" "false" "false"
        ;;
esac