#!/usr/bin/env bash
#
# rerun-ci-on-skip-sonar-cloud.sh
#
# When skip-sonar-cloud is added after the quality-gate job already failed,
# re-run only failed jobs on the latest ci.yml run for the PR branch.
#
# The overall workflow often stays "in_progress" for a long time because of
# E2E, while SonarCloud quality gate status has already finished. Leaving
# those runs alone would never pick up the skip label (the gate job already
# exited), so we inspect that job and cancel + rerun when it failed.
#
# Environment (required):
#   GH_TOKEN   - GitHub token with actions:write
#   REPO       - owner/repo
#   HEAD_REF   - PR head branch name
#
# Optional:
#   WORKFLOW_FILE - workflow filename (default: ci.yml)
#   QUALITY_GATE_JOB_NAME - job name to inspect (default: SonarCloud quality gate status)
#   MAX_CANCEL_WAIT_SEC - seconds to wait for cancellation (default: 600)
#

set -euo pipefail

GH_TOKEN="${GH_TOKEN:?GH_TOKEN environment variable must be set}"
REPO="${REPO:?REPO environment variable must be set}"
HEAD_REF="${HEAD_REF:?HEAD_REF environment variable must be set}"
WORKFLOW_FILE="${WORKFLOW_FILE:-ci.yml}"
QUALITY_GATE_JOB_NAME="${QUALITY_GATE_JOB_NAME:-SonarCloud quality gate status}"
MAX_CANCEL_WAIT_SEC="${MAX_CANCEL_WAIT_SEC:-600}"

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

JOBS_JSON=$(gh api "repos/$REPO/actions/runs/$RUN_ID/jobs" --paginate)
GATE_STATUS=$(jq -r --arg name "$QUALITY_GATE_JOB_NAME" '
  [.jobs[] | select(.name == $name) | .status] | first // empty
' <<< "$JOBS_JSON")
GATE_CONCLUSION=$(jq -r --arg name "$QUALITY_GATE_JOB_NAME" '
  [.jobs[] | select(.name == $name) | .conclusion] | first // empty
' <<< "$JOBS_JSON")

echo "Quality gate job status=${GATE_STATUS:-missing} conclusion=${GATE_CONCLUSION:-none}"

# Still running: the live label read in the gate job will skip. Do not cancel.
if [[ "$GATE_STATUS" == "queued" || "$GATE_STATUS" == "in_progress" || "$GATE_STATUS" == "pending" || "$GATE_STATUS" == "waiting" ]]; then
  echo "Quality gate job is still running; it will read skip-sonar-cloud live."
  exit 0
fi

# Already passed or never ran / skipped for other reasons: nothing to unblock.
if [[ "$GATE_CONCLUSION" != "failure" ]]; then
  echo "Quality gate job did not fail (conclusion=${GATE_CONCLUSION:-none}); no rerun needed."
  exit 0
fi

# Gate already failed. If the overall run is still open (typical while E2E
# continues), cancel first so --failed can be applied.
if [[ "$STATUS" == "in_progress" || "$STATUS" == "queued" || "$STATUS" == "pending" || "$STATUS" == "waiting" ]]; then
  echo "Cancelling run $RUN_ID so failed jobs can be re-triggered..."
  gh run cancel "$RUN_ID" --repo "$REPO" || true

  ELAPSED=0
  while [[ $ELAPSED -lt $MAX_CANCEL_WAIT_SEC ]]; do
    STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq '.status')
    echo "Status: $STATUS (${ELAPSED}s elapsed)"
    if [[ "$STATUS" != "in_progress" && "$STATUS" != "queued" && "$STATUS" != "pending" && "$STATUS" != "waiting" ]]; then
      break
    fi
    sleep 15
    ELAPSED=$((ELAPSED + 15))
  done

  FINAL_STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq '.status')
  if [[ "$FINAL_STATUS" == "in_progress" || "$FINAL_STATUS" == "queued" || "$FINAL_STATUS" == "pending" || "$FINAL_STATUS" == "waiting" ]]; then
    echo "Timeout: workflow still $FINAL_STATUS after ${MAX_CANCEL_WAIT_SEC}s"
    exit 1
  fi
fi

echo "Re-running failed jobs on $RUN_ID..."
if gh run rerun "$RUN_ID" --repo "$REPO" --failed; then
  echo "Failed jobs re-triggered successfully"
else
  echo "Rerun not possible (run may not be in a retriable state or had no failed jobs)"
fi
