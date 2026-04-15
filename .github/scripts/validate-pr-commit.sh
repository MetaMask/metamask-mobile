#!/bin/bash

#
# validate-pr-commit.sh
#
# Resolves the HEAD (last) commit of a PR and outputs it for the workflow.
# Caller only needs to provide the PR number; no commit hash input required.
#
# Environment Variables (required):
#   PR_NUMBER       - The PR number to resolve
#   GITHUB_TOKEN    - GitHub API token for authentication
#   GITHUB_REPOSITORY - Repository in format "owner/repo"
#
# Outputs (to GITHUB_OUTPUT):
#   pr_number   - The PR number (for downstream steps)
#   commit_sha  - The HEAD commit SHA of the PR branch
#
# Exits with code 0 on success, 1 on failure
#

set -euo pipefail

# Ensure required environment variables are set
PR_NUMBER="${PR_NUMBER:?PR_NUMBER environment variable must be set}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN environment variable must be set}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY environment variable must be set}"

OWNER="${GITHUB_REPOSITORY%%/*}"
REPO="${GITHUB_REPOSITORY#*/}"

API_BASE="https://api.github.com/repos/${OWNER}/${REPO}"

echo "🔍 Resolving HEAD commit for PR #${PR_NUMBER}..." >&2

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
  pr_head_sha=$(echo "$pr_details" | jq -r '.head.sha')
  pr_state=$(echo "$pr_details" | jq -r '.state')

  echo "  PR head SHA: ${pr_head_sha}" >&2
  echo "  PR state: ${pr_state}" >&2
else
  echo "❌ PR #${PR_NUMBER} not found" >&2
  exit 1
fi

echo "✅ Resolved PR #${PR_NUMBER} HEAD commit: ${pr_head_sha}" >&2
{
  echo "pr_number=${PR_NUMBER}"
  echo "commit_sha=${pr_head_sha}"
} >> "$GITHUB_OUTPUT"
exit 0
