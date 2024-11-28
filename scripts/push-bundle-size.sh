#!/usr/bin/env bash

set -euo pipefail

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if running in GitHub Actions
if [[ "${GITHUB_ACTIONS:-}" != 'true' ]]; then
    log "Error: This script must be run in a GitHub Actions environment"
    exit 1
fi

if [[ -z "${GITHUB_ACTOR:-}" ]]; then
    log "Error: GITHUB_ACTOR environment variable must be set"
    exit 1
fi

# Check for GITHUB_TOKEN
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    log "Error: GITHUB_TOKEN environment variable must be set"
    exit 1
fi

# Set up git configuration
git config --global user.email "metamaskbot@users.noreply.github.com"
git config --global user.name "MetaMask Bot"

# Create a temporary directory
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

# Clone the repository
repo_url="https://$GITHUB_ACTOR:$GITHUB_TOKEN@github.com/metamask/mobile_bundlesize_stats.git"
if ! git clone "$repo_url" "$temp_dir"; then
    log "Error: Failed to clone repository"
    exit 1
fi

# Get commit ID and bundle size
commit_id="$(git rev-parse HEAD)"
bundle_size="$(stat -f%z 'ios/main.jsbundle' 2>/dev/null || stat -c%s 'ios/main.jsbundle')"
timestamp="$(date +%s%3N)"
output_file="$temp_dir/stats/bundle_size_data.js"

./scripts/update_bundle_size.py "$output_file" "$commit_id" "$bundle_size" "$timestamp"

cd "$temp_dir"
# Commit and push changes
git add "$output_file"
if git commit -m "Add bundle size for commit: ${commit_id}"; then
    if git push origin HEAD:main; then
        log "Success: Bundle size data updated and pushed to main branch"
    else
        log "Error: Failed to push changes"
        exit 1
    fi
else
    log "Info: No changes to commit"
fi

log "Script completed successfully"
