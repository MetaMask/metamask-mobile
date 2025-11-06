#!/usr/bin/env bash
echo "=== PR Build Cache Check ==="

# Default to building both platforms
SKIP_IOS_BUILD="false"
SKIP_ANDROID_BUILD="false"

# Check if we have PR number
if [[ -z "$GITHUB_PR_NUMBER" ]]; then
    echo "No PR number found, skipping cache check and proceeding with both builds"
    # Set empty cache keys to prevent restore attempts
    envman add --key IOS_PR_BUILD_CACHE_KEY --value ""
    envman add --key ANDROID_PR_BUILD_CACHE_KEY --value ""
else
    echo "PR number found: $GITHUB_PR_NUMBER"
    
    # Generate app code hash based on commits since last successful build
    echo "Generating content hash for cache key..."
    
    # LAST_SUCCESSFUL_COMMIT will be set by reading from cache below
    
    
    # Use current commit SHA as the cache key identifier
    if git rev-parse --git-dir > /dev/null 2>&1; then
        CURRENT_COMMIT_SHORT=$(git rev-parse HEAD 2>/dev/null | cut -c1-8)
    else
        # Fallback when git is not available - use Bitrise env vars
        CURRENT_COMMIT_SHORT=${BITRISE_GIT_COMMIT:0:8}
        if [[ -z "$CURRENT_COMMIT_SHORT" ]]; then
            # Last resort - use a timestamp-based identifier
            CURRENT_COMMIT_SHORT=$(date +%s | tail -c 8)
        fi
    fi
    
    # Try to get the last successful build commit from cache
    LAST_BUILD_COMMIT_CACHE_KEY="last-e2e-build-commit-pr-${GITHUB_PR_NUMBER}"
    
    # Read the last successful build commit if available
    if [[ -f "/tmp/last-build-commit/commit" ]]; then
        LAST_SUCCESSFUL_COMMIT=$(head -1 /tmp/last-build-commit/commit)
        echo "Found last successful build commit: $LAST_SUCCESSFUL_COMMIT"
    else
        echo "No previous successful build commit found"
    fi
    
    # Check if we can reuse the cache from last successful build
    if [[ -n "$LAST_SUCCESSFUL_COMMIT" ]]; then
        LAST_COMMIT_SHORT=$(echo "$LAST_SUCCESSFUL_COMMIT" | cut -c1-8)
        
        # First, verify that the last successful commit exists in the current git history
        if ! git rev-parse --verify "${LAST_SUCCESSFUL_COMMIT}^{commit}" > /dev/null 2>&1; then
            echo "Last successful commit ${LAST_COMMIT_SHORT} not found in current git history - need fresh build"
            APP_CODE_HASH="$CURRENT_COMMIT_SHORT"
        else
            # Check if there are any app code changes since the last successful commit
            # Include all files that affect the built app for E2E testing
            if git rev-parse --git-dir > /dev/null 2>&1 && \
               git diff --name-only "${LAST_SUCCESSFUL_COMMIT}..HEAD" 2>/dev/null | \
               grep -E '^(package\.json|yarn\.lock|Podfile\.lock|Gemfile\.lock|metro\.config\.js|babel\.config\.js|app\.config\.js|react-native\.config\.js|tsconfig\.json|index\.js|shim\.js)$|^(ios|android|app|ppom|scripts|patches)/' | \
               grep -v '^app/e2e/' | grep -v '^e2e/' | grep -v '^wdio/' > /dev/null; then
                echo "App code changes found since commit ${LAST_COMMIT_SHORT} - need fresh build"
                APP_CODE_HASH="$CURRENT_COMMIT_SHORT"
            else
                echo "No app code changes since commit ${LAST_COMMIT_SHORT} - reusing cache"
                APP_CODE_HASH="$LAST_COMMIT_SHORT"
            fi
        fi
    else
        echo "No previous successful build found - using current commit"
        APP_CODE_HASH="$CURRENT_COMMIT_SHORT"
    fi
    
    echo "Using APP_CODE_HASH: $APP_CODE_HASH"
    
    # Generate cache keys
    IOS_CACHE_KEY="e2e-build-ios-pr-${GITHUB_PR_NUMBER}-${APP_CODE_HASH}"
    ANDROID_CACHE_KEY="e2e-build-android-pr-${GITHUB_PR_NUMBER}-${APP_CODE_HASH}"
    
    echo "Cache keys generated:"
    echo "  iOS: $IOS_CACHE_KEY"
    echo "  Android: $ANDROID_CACHE_KEY"
    
    # Store cache keys
    envman add --key IOS_PR_BUILD_CACHE_KEY --value "$IOS_CACHE_KEY"
    envman add --key ANDROID_PR_BUILD_CACHE_KEY --value "$ANDROID_CACHE_KEY"
fi

# Set initial values
envman add --key SKIP_IOS_BUILD --value "$SKIP_IOS_BUILD"
envman add --key SKIP_ANDROID_BUILD --value "$SKIP_ANDROID_BUILD"