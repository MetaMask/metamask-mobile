#!/usr/bin/env bash
# Remove pr-not-ready-for-e2e after it lands on an OTA pull request.
#
# gh pr create returns before the separate `opened` auto-label workflow runs.
# Tags older than the ota-base/** ignore still apply the label, and
# ci-status-gate then fails Check all jobs pass. This script runs once that
# workflow completes. It removes the label and reopens the pull request so CI
# starts again without it. Auto-label listens only to `opened`, so the reopen
# does not add the label back.
#
# Required env: GH_TOKEN, GITHUB_REPOSITORY
# Optional env:
#   PRS_JSON            [{number, baseRef}] for tests
#   GITHUB_EVENT_PATH   workflow_run payload when PRS_JSON is unset
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

BLOCKING_LABEL='pr-not-ready-for-e2e'

if [[ -n "${PRS_JSON:-}" ]]; then
  JSON="$PRS_JSON"
elif [[ -n "${GITHUB_EVENT_PATH:-}" && -f "$GITHUB_EVENT_PATH" ]]; then
  JSON=$(jq -c '[.workflow_run.pull_requests[]? | {number, baseRef: .base.ref}]' "$GITHUB_EVENT_PATH")
else
  echo "::error::PRS_JSON or GITHUB_EVENT_PATH is required" >&2
  exit 1
fi

mapfile -t ROWS < <(printf '%s' "$JSON" | jq -c '.[]')
for row in "${ROWS[@]}"; do
  number=$(printf '%s' "$row" | jq -r '.number')
  base=$(printf '%s' "$row" | jq -r '.baseRef // .base.ref // empty')
  if [[ ! "$number" =~ ^[0-9]+$ || "$base" != ota-base/* ]]; then
    continue
  fi

  labels=$(gh pr view "$number" --repo "$GITHUB_REPOSITORY" --json labels --jq '.labels[].name')
  if ! printf '%s\n' "$labels" | grep -qx "$BLOCKING_LABEL"; then
    continue
  fi

  echo "Removing late ${BLOCKING_LABEL} from #${number} and reopening it for CI" >&2
  gh pr edit "$number" --repo "$GITHUB_REPOSITORY" --remove-label "$BLOCKING_LABEL"
  # `reopened` retriggers ci.yml. `edited` does not.
  gh pr close "$number" --repo "$GITHUB_REPOSITORY" --comment "Removing ${BLOCKING_LABEL} so OTA CI can run. Refs: MCRM-164"
  gh pr reopen "$number" --repo "$GITHUB_REPOSITORY"
done
