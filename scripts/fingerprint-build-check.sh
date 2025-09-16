#!/bin/bash

# Fingerprint Build Check Script
# Determines whether to do a full build, repack, or skip based on fingerprint comparison
#
# Usage: ./scripts/fingerprint-build-check.sh <platform> <build_action> <artifact_path> <pr_number>
#
# Outputs (via GITHUB_OUTPUT):
#   - build_method: full|repack|skip
#   - can_repack: true|false
#   - cache_hit: true|false

set -euo pipefail

# Parse arguments
PLATFORM="${1:-}"
BUILD_ACTION="${2:-}"
ARTIFACT_PATH="${3:-}"
PR_NUMBER="${4:-main}"

# Validate required arguments
if [[ -z "$PLATFORM" ]] || [[ -z "$BUILD_ACTION" ]]; then
    echo "❌ Error: Missing required arguments"
    echo "Usage: $0 <platform> <build_action> [artifact_path] [pr_number]"
    exit 1
fi

# Initialize output variables
BUILD_METHOD=""
CAN_REPACK="false"
CACHE_HIT="false"

# Helper function to set outputs
set_outputs() {
    local method="$1"
    local repack="$2"
    local hit="$3"
    
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "build_method=$method" >> "$GITHUB_OUTPUT"
        echo "can_repack=$repack" >> "$GITHUB_OUTPUT"
        echo "cache_hit=$hit" >> "$GITHUB_OUTPUT"
    else
        # For local testing
        echo "OUTPUT: build_method=$method"
        echo "OUTPUT: can_repack=$repack"
        echo "OUTPUT: cache_hit=$hit"
    fi
}

# Helper function to check artifact validity
check_artifact_validity() {
    local platform="$1"
    local path="$2"
    
    if [[ -z "$path" ]] || [[ "$path" == "" ]]; then
        return 1
    fi
    
    if [[ "$platform" == "android" ]]; then
        if [[ ! -f "$path" ]]; then
            return 1
        fi
        local size=$(stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo "0")
        [[ $size -gt 1000000 ]]  # APK should be > 1MB
    elif [[ "$platform" == "ios" ]]; then
        if [[ ! -d "$path" ]]; then
            return 1
        fi
        local size=$(du -sb "$path" 2>/dev/null | cut -f1 || echo "0")
        [[ $size -gt 10000000 ]]  # .app should be > 10MB
    else
        return 1
    fi
}

# Main logic
echo "🔍 Fingerprint Build Check for $PLATFORM"
echo "============================================"
echo "📊 Input Parameters:"
echo "  - Build action: $BUILD_ACTION"
echo "  - Platform: $PLATFORM"
echo "  - PR Number: ${PR_NUMBER}"
echo "  - Artifact Path: ${ARTIFACT_PATH:-none}"
echo ""

case "$BUILD_ACTION" in
    "skip")
        echo "⏭️ Build action is skip - no build required"
        set_outputs "skip" "false" "false"
        exit 0
        ;;
        
    "full")
        echo "🏗️ Build action is full - native code likely changed"
        set_outputs "full" "false" "false"
        exit 0
        ;;
        
    "check_fingerprint")
        echo "🔍 Checking fingerprint for potential reuse..."
        echo ""
        
        # Check for saved fingerprint
        if [[ ! -f ".app-native-fingerprint" ]]; then
            echo "❌ No saved fingerprint found"
            set_outputs "full" "false" "false"
            exit 0
        fi
        
        SAVED_FP=$(cat .app-native-fingerprint)
        echo "📌 Saved fingerprint: $SAVED_FP"
        
        # Generate current fingerprint
        CURRENT_FP=$(yarn -s fingerprint:generate 2>/dev/null || echo "")
        if [[ -z "$CURRENT_FP" ]]; then
            echo "❌ Failed to generate current fingerprint"
            set_outputs "full" "false" "false"
            exit 0
        fi
        echo "🔍 Current fingerprint: $CURRENT_FP"
        echo ""
        
        # Check if fingerprints match
        if yarn fingerprint:check; then
            echo "✅ Fingerprints match! Native code unchanged."
            echo "📦 Checking for existing artifacts..."
            
            # Check artifact validity
            if check_artifact_validity "$PLATFORM" "$ARTIFACT_PATH"; then
                local artifact_type=$([[ "$PLATFORM" == "android" ]] && echo "APK" || echo ".app bundle")
                echo "✅ Found valid cached $artifact_type"
                echo "🎯 Decision: REPACK - Using cached build with updated JS bundle"
                set_outputs "repack" "true" "true"
            else
                echo "🔍 No valid cached artifact found"
                echo "🎯 Decision: FULL BUILD - No cached artifacts available"
                set_outputs "full" "false" "false"
            fi
        else
            echo "🔄 Fingerprints differ - native code has changed"
            echo "  Saved:   $SAVED_FP"
            echo "  Current: $CURRENT_FP"
            echo "🎯 Decision: FULL BUILD - Native code changed"
            set_outputs "full" "false" "false"
        fi
        ;;
        
    *)
        echo "❓ Unknown build action: $BUILD_ACTION"
        echo "🎯 Decision: FULL BUILD - Unknown action, defaulting to safe option"
        set_outputs "full" "false" "false"
        ;;
esac

echo ""
echo "============================================"
echo "📊 Final Decision Summary:"
echo "  - Build Method: ${BUILD_METHOD:-determined}"
echo "  - Can Repack: ${CAN_REPACK}"
echo "  - Cache Hit: ${CACHE_HIT}"
echo "============================================"
