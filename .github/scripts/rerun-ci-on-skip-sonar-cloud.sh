#!/usr/bin/env bash
#
# rerun-ci-on-skip-sonar-cloud.sh
#
# When skip-sonar-cloud is added after the quality-gate job already failed,
# re-run only failed jobs on the latest ci.yml run for the PR branch.
# In-progress runs are left alone: the quality-gate job reads the label live.
#
# Environment (required):
#   GH_TOKEN   - GitHub token with actions:write
#   REPO       - owner/repo
#   HEAD_REF   - PR head branch name
#
# Optional:
#   WORKFLOW_FILE - workflow filename (default: ci.yml)
#

set -euo pipefail

GH_TOKEN="${GH_TOKEN:?GH_TOKEN environment variable must be set}"
REPO="${REPO:?REPO environment variable must be set}"
HEAD_REF="${HEAD_REF:?HEAD_REF environment variable must be set}"
WORKFLOW_FILE="${WORKFLOW_FILE:-ci.yml}"

export GH_TOKEN

echo "Looking for latest ${WORKFLOW_FILE} run on ${HEAD_REF}..."
RUN_JSON=$(gh run list \
  --repo "$REPO" \
  --branch "$HEAD_REF" \
  --workflow "$WORKFLOW_FILE" \
  --limit 1 \
  --json databaseId,status)

RUN_ID=$(jq -r '.[0].databaseId // empty' <<< "$RUN_JSON")
STATUS=$(jq -r '.[0].status // empty' <<< "$RUN_JSON")

if [[ -z "$RUN_ID" ]]; then
  echo "No CI workflow run found for branch $HEAD_REF"
  exit 0
fi

echo "Latest run: $RUN_ID (status=$STATUS)"

if [[ "$STATUS" == "in_progress" || "$STATUS" == "queued" || "$STATUS" == "pending" || "$STATUS" == "waiting" ]]; then
  echo "CI is still running; the quality-gate job will read skip-sonar-cloud live."
  exit 0
fi

echo "Re-running failed jobs on $RUN_ID..."
if gh run rerun "$RUN_ID" --repo "$REPO" --failed; then
  echo "Failed jobs re-triggered successfully"
else
  echo "Rerun not possible (run may not be in a retriable state or had no failed jobs)"
fi
