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
# Environment Variables (optional):
#   EXPECTED_SHA      - Fail unless the PR head is this commit
#
# Outputs (GITHUB_OUTPUT):
#   head_sha          - The PR head commit the merge state applies to
#

set -euo pipefail

# Head and merge state are read together so they describe the same commit.
# mergeStateStatus is computed asynchronously and reads UNKNOWN until it is ready.
for _ in 1 2 3 4 5 6; do
  read -r BASE_REF HEAD_SHA MERGE_STATE < <(gh pr view "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" \
    --json baseRefName,headRefOid,mergeStateStatus \
    --jq '"\(.baseRefName) \(.headRefOid) \(.mergeStateStatus)"')
  if [[ "$MERGE_STATE" != "UNKNOWN" ]]; then
    break
  fi
  sleep 10
done

if [[ "$BASE_REF" != "stable" || ! "$MERGE_STATE" =~ ^(CLEAN|UNSTABLE|HAS_HOOKS)$ ]]; then
  echo "::error::Release PR #${PR_NUMBER} must be an open, non-draft PR into stable that meets the stable branch rules (approvals, required checks). Base: ${BASE_REF}, merge state: ${MERGE_STATE}."
  exit 1
fi

if [[ -n "${EXPECTED_SHA:-}" && "$HEAD_SHA" != "$EXPECTED_SHA" ]]; then
  echo "::error::Release PR #${PR_NUMBER} head moved to ${HEAD_SHA} (expected ${EXPECTED_SHA}). Re-run on the current head."
  exit 1
fi

echo "head_sha=${HEAD_SHA}" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "Release PR #${PR_NUMBER} meets the stable branch rules at ${HEAD_SHA} (merge state: ${MERGE_STATE})."
