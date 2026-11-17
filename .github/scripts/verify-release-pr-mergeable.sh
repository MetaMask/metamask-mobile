#!/bin/bash

#
# verify-release-pr-mergeable.sh
#
# Fails unless a release PR into stable currently satisfies every rule on stable, as reported by
# GitHub's mergeStateStatus. What the PR needs (approvals, required reviewers, stale-review
# dismissal, required checks) is configured only in the stable rulesets, not here.
#
# reviewDecision is not used: it is null once the ruleset has a required-reviewers rule.
#
# Environment Variables (required):
#   PR_NUMBER         - The release PR to verify
#   GH_TOKEN          - GitHub API token with pull-requests: read
#   GITHUB_REPOSITORY - Repository in format "owner/repo"
#
# Exits with code 0 on success, 1 on failure
#

set -euo pipefail

PR_NUMBER="${PR_NUMBER:?PR_NUMBER environment variable must be set}"
GH_TOKEN="${GH_TOKEN:?GH_TOKEN environment variable must be set}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY environment variable must be set}"

# GitHub computes mergeStateStatus asynchronously and returns UNKNOWN until it is ready.
for attempt in 1 2 3 4 5 6; do
  PR_JSON=$(gh pr view "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" --json url,state,baseRefName,isDraft,mergeStateStatus)
  MERGE_STATE=$(jq -r '.mergeStateStatus' <<<"$PR_JSON")
  if [[ "$MERGE_STATE" != "UNKNOWN" || "$(jq -r '.state' <<<"$PR_JSON")" != "OPEN" ]]; then
    break
  fi
  echo "Merge state of PR #${PR_NUMBER} not computed yet (attempt ${attempt}); retrying in 10s..."
  sleep 10
done

PR_URL=$(jq -r '.url' <<<"$PR_JSON")
PR_STATE=$(jq -r '.state' <<<"$PR_JSON")
BASE_REF=$(jq -r '.baseRefName' <<<"$PR_JSON")

if [[ "$PR_STATE" != "OPEN" ]]; then
  echo "::error::Release PR ${PR_URL} is ${PR_STATE}; it must be open."
  exit 1
fi

if [[ "$BASE_REF" != "stable" ]]; then
  echo "::error::${PR_URL} targets ${BASE_REF}; it must be the release PR into stable."
  exit 1
fi

# Draft PRs can report BLOCKED rather than DRAFT, so check the flag directly.
if [[ "$(jq -r '.isDraft' <<<"$PR_JSON")" == "true" ]]; then
  echo "::error::Release PR ${PR_URL} is a draft. Mark it ready for review; a draft PR cannot be merged into stable."
  exit 1
fi

case "$MERGE_STATE" in
  CLEAN | HAS_HOOKS | UNSTABLE)
    echo "✅ Release PR ${PR_URL} meets the stable branch rules (merge state: ${MERGE_STATE})."
    ;;
  BLOCKED)
    echo "::error::Release PR ${PR_URL} does not meet the stable branch rules yet (for example, required approvals). See the merge box on the PR."
    exit 1
    ;;
  DIRTY)
    echo "::error::Release PR ${PR_URL} has merge conflicts with stable."
    exit 1
    ;;
  *)
    echo "::error::Release PR ${PR_URL} cannot be merged into stable (merge state: ${MERGE_STATE})."
    exit 1
    ;;
esac
