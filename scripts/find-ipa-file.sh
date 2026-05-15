#!/usr/bin/env bash

# Find IPA file for iOS builds
#
# Usage:
#   ./scripts/find-ipa-file.sh [ipa_path]
#
# Arguments:
#   ipa_path  - Optional: Direct path to IPA file (if already known)
#
# Environment variables:
#   IPA_PATH - IPA path from previous build step (generic)
#
# Output:
#   Sets IPA_PATH environment variable with absolute path to IPA file

set -e

# Check if IPA path is provided as argument
if [ $# -ge 1 ] && [ -n "$1" ]; then
  IPA_PATH="$1"
  echo "✅ Using provided IPA path: $IPA_PATH"
elif [ -n "${IPA_PATH:-}" ] && [ -f "$IPA_PATH" ]; then
  # Check generic IPA_PATH variable
  echo "✅ Found IPA from IPA_PATH: $IPA_PATH"
else
  # Fallback: search for IPA in build output directory
  IPA_DIR="ios/build/output"
  if [ -d "$IPA_DIR" ]; then
    # Find the most recent IPA file by modification time
    # Use find with -exec to run ls -t on all found files, which sorts by modification time (newest first)
    IPA_PATH=$(find "$IPA_DIR" -name "*.ipa" -type f -exec ls -t {} + 2>/dev/null | head -1)
    if [ -z "$IPA_PATH" ]; then
      echo "❌ Error: No IPA file found in $IPA_DIR"
      echo "Available files:"
      ls -la "$IPA_DIR" || true
      exit 1
    fi
    echo "✅ Found IPA in build output: $IPA_PATH"
  else
    echo "❌ Error: IPA directory not found: $IPA_DIR"
    if [ -n "${IPA_PATH:-}" ]; then
      echo "IPA_PATH: $IPA_PATH"
    fi
    exit 1
  fi
fi

# Verify the file exists
if [ ! -f "$IPA_PATH" ]; then
  echo "❌ Error: IPA file not found at: $IPA_PATH"
  exit 1
fi

# Convert to absolute path if relative
if [[ "$IPA_PATH" != /* ]]; then
  IPA_PATH="$(pwd)/$IPA_PATH"
fi

# Export based on CI environment
if [ -n "${GITHUB_ENV:-}" ]; then
  # GitHub Actions: use GITHUB_ENV
  echo "IPA_PATH=$IPA_PATH" >> "$GITHUB_ENV"
else
  # Local or other CI: just export
  export IPA_PATH="$IPA_PATH"
fi

echo "IPA_PATH set to: $IPA_PATH"
