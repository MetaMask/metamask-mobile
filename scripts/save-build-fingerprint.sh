#!/bin/bash

# Save Build Fingerprint Script
# Generates and saves the fingerprint after a successful build
#
# Usage: ./scripts/save-build-fingerprint.sh <platform>
#
# Outputs (via GITHUB_OUTPUT):
#   - fingerprint: The generated fingerprint hash

set -euo pipefail

# Parse arguments
PLATFORM="${1:-}"

# Validate required arguments
if [[ -z "$PLATFORM" ]]; then
    echo "❌ Error: Missing required argument"
    echo "Usage: $0 <platform>"
    exit 1
fi

echo "Generating fingerprint for $PLATFORM..."

# Generate fingerprint
FINGERPRINT=$(yarn -s fingerprint:generate)

if [[ -z "$FINGERPRINT" ]]; then
    echo "❌ Error: Failed to generate fingerprint"
    exit 1
fi

# Save to file
echo "$FINGERPRINT" > .app-native-fingerprint
echo "✅ Fingerprint saved: $FINGERPRINT"

# Output for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "fingerprint=$FINGERPRINT" >> "$GITHUB_OUTPUT"
else
    # For local testing
    echo "OUTPUT: fingerprint=$FINGERPRINT"
fi
