#!/bin/bash

#
# verify-commit-sha.sh
#
# Verifies that the currently checked-out commit matches an expected commit SHA.
#
# Environment Variables (required):
#   TARGET_COMMIT_HASH - The expected commit SHA that should be checked out
#
# Behavior:
#   - Reads the actual checked-out commit using `git rev-parse HEAD`
#   - Compares it with the expected commit SHA
#   - Exits with code 1 if they don't match (fails the workflow step)
#   - Exits with code 0 if they match (continues workflow)
#

set -euo pipefail

# Ensure required environment variable is set
EXPECTED_COMMIT="${TARGET_COMMIT_HASH:?TARGET_COMMIT_HASH environment variable must be set}"

ACTUAL_COMMIT=$(git rev-parse HEAD)

if [ "$EXPECTED_COMMIT" != "$ACTUAL_COMMIT" ]; then
  echo "::error::Security check failed: Checked out commit does not match expected commit"
  echo "Expected: ${EXPECTED_COMMIT}"
  echo "Actual:   ${ACTUAL_COMMIT}"
  exit 1
fi

echo "✅ Verified: Checked out commit (${ACTUAL_COMMIT}) matches expected commit (${EXPECTED_COMMIT})"
