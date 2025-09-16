#!/bin/bash
set -euo pipefail

PLATFORM="${1:-}"
[[ -z "$PLATFORM" ]] && { echo "Usage: $0 <platform>"; exit 1; }

FINGERPRINT=$(yarn -s fingerprint:generate)
[[ -z "$FINGERPRINT" ]] && { echo "Failed to generate fingerprint"; exit 1; }

echo "$FINGERPRINT" > .app-native-fingerprint
echo "Fingerprint saved: $FINGERPRINT"
[[ -n "${GITHUB_OUTPUT:-}" ]] && echo "fingerprint=$FINGERPRINT" >> "$GITHUB_OUTPUT"