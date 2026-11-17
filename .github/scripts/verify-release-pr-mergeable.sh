#!/bin/bash

#
# verify-release-pr-mergeable.sh
#
# Fails unless a release PR into stable meets every stable branch rule (approvals, required
# reviewers, required checks), as reported by GitHub's mergeStateStatus. The criteria are
# configured only in the stable rulesets. reviewDecision is not used: it is null once the
# ruleset has a required-reviewers rule.
#
# Environment Variables (required):
#   PR_NUMBER         - The release PR to verify
#   GH_TOKEN          - GitHub API token with pull-requests: read
#   GITHUB_REPOSITORY - Repository in format "owner/repo"
#

set -euo pipefail

# mergeStateStatus is computed asynchronously and reads UNKNOWN until it is ready.
for _ in 1 2 3 4 5 6; do
  read -r BASE_REF MERGE_STATE < <(gh pr view "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" \
    --json baseRefName,mergeStateStatus --jq '"\(.baseRefName) \(.mergeStateStatus)"')
  if [[ "$MERGE_STATE" != "UNKNOWN" ]]; then
    break
  fi
  sleep 10
done

if [[ "$BASE_REF" != "stable" || ! "$MERGE_STATE" =~ ^(CLEAN|UNSTABLE|HAS_HOOKS)$ ]]; then
  echo "::error::Release PR #${PR_NUMBER} must be an open, non-draft PR into stable that meets the stable branch rules (approvals, required checks). Base: ${BASE_REF}, merge state: ${MERGE_STATE}."
  exit 1
fi

echo "Release PR #${PR_NUMBER} meets the stable branch rules (merge state: ${MERGE_STATE})."
