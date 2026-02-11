#!/bin/bash

#
# validate-pr-commit.sh
#
# Validates that a given commit hash is the HEAD (last commit) of a specified PR.
#
# Environment Variables (required):
#   COMMIT_HASH      - The commit SHA to validate
#   PR_NUMBER      - The PR number to check against
#   BASE_BRANCH    - The base branch of the PR (for validation)
#   GITHUB_TOKEN   - GitHub API token for authentication
#   GITHUB_REPOSITORY - Repository in format "owner/repo"
#
# Outputs:
#   Sets GITHUB_OUTPUT pr_number if validation succeeds
#   Exits with code 0 on success, 1 on failure
#
#

set -euo pipefail

# Ensure required environment variables are set
COMMIT_HASH="${COMMIT_HASH:?COMMIT_HASH environment variable must be set}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER environment variable must be set}"
BASE_BRANCH="${BASE_BRANCH:?BASE_BRANCH environment variable must be set}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN environment variable must be set}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY environment variable must be set}"

OWNER="${GITHUB_REPOSITORY%%/*}"
REPO="${GITHUB_REPOSITORY#*/}"

API_BASE="https://api.github.com/repos/${OWNER}/${REPO}"

echo "🔍 Validating that commit ${COMMIT_HASH} is the HEAD (last commit) of PR #${PR_NUMBER} (base: ${BASE_BRANCH})..." >&2

# Function to make GitHub API calls
api_call() {
  local endpoint="$1"
  curl -sS \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "${API_BASE}${endpoint}"
}

# Get PR details
echo "📋 Fetching PR #${PR_NUMBER} details..." >&2
pr_details=$(api_call "/pulls/${PR_NUMBER}")

# Check if PR exists
if echo "$pr_details" | jq -e '.id' > /dev/null 2>&1; then
  pr_base_ref=$(echo "$pr_details" | jq -r '.base.ref')
  pr_head_sha=$(echo "$pr_details" | jq -r '.head.sha')
  pr_state=$(echo "$pr_details" | jq -r '.state')
  
  echo "  PR base branch: ${pr_base_ref}" >&2
  echo "  PR head SHA: ${pr_head_sha}" >&2
  echo "  PR state: ${pr_state}" >&2
else
  echo "❌ PR #${PR_NUMBER} not found" >&2
  exit 1
fi

# Validate base branch matches (security-critical)
if [ "$pr_base_ref" != "$BASE_BRANCH" ]; then
  echo "❌ Validation failed: PR base branch (${pr_base_ref}) does not match provided base branch (${BASE_BRANCH})" >&2
  echo "💡 The base_branch input must exactly match the PR's actual base branch to prevent fingerprint comparison against the wrong target." >&2
  exit 1
fi

# Validate that commit is the PR head (last commit)
if [ "$pr_head_sha" = "$COMMIT_HASH" ]; then
  echo "✅ Commit ${COMMIT_HASH} is the HEAD (last commit) of PR #${PR_NUMBER}" >&2
  echo "pr_number=${PR_NUMBER}" >> "$GITHUB_OUTPUT"
  exit 0
else
  echo "❌ Validation failed: Commit ${COMMIT_HASH} is not the HEAD of PR #${PR_NUMBER}" >&2
  echo "❌ PR HEAD commit is: ${pr_head_sha}" >&2
  echo "❌ Target commit is:  ${COMMIT_HASH}" >&2
  echo "" >&2
  echo "💡 The commit hash must be the last commit in the PR branch." >&2
  echo "💡 Please use the HEAD commit SHA of the PR branch." >&2
  exit 1
fi
