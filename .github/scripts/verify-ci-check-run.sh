#!/usr/bin/env bash
# Verifies the push-event ci.yml "Check all jobs pass" job succeeded on RELEASE_SHA.
# pull_request and other events do not satisfy the gate.
# Counterpart of metamask-extension/.github/scripts/verify-ci-checks.sh.

set -euo pipefail

if [[ -n "${PR_NUMBER:-}" ]]; then
  labels=$(gh api -H "Accept: application/vnd.github+json" \
    "/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/labels?per_page=100")
  if jq -e 'any(.[]; .name == "skip-ci-gate")' <<<"$labels" >/dev/null; then
    {
      echo "### CI gate skipped"
      echo ""
      printf 'PR: https://github.com/%s/pull/%s\n' "${GITHUB_REPOSITORY}" "${PR_NUMBER}"
    } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
    exit 0
  fi
fi

run=$(gh api -H "Accept: application/vnd.github+json" \
  "/repos/${GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${RELEASE_SHA}&event=push&per_page=1" \
  --jq '[.workflow_runs[] | select(.event == "push")][0] // empty')
if [[ -z "$run" ]]; then
  echo "::error::CI has not run on push for this SHA (${RELEASE_SHA})."
  exit 1
fi
if [[ "$(jq -r '.status' <<<"$run")" != "completed" ]]; then
  echo "::error::Push CI is still running; re-run the OTA when it finishes."
  exit 1
fi

run_id=$(jq -r '.id' <<<"$run")
conclusion=$(gh api -H "Accept: application/vnd.github+json" \
  "/repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}/jobs?per_page=100" \
  --jq '[.jobs[] | select(.name == "Check all jobs pass")][0].conclusion // empty')
if [[ "$conclusion" != "success" ]]; then
  echo "::error::'Check all jobs pass' did not succeed (conclusion: ${conclusion:-none})."
  exit 1
fi
echo "Check all jobs pass succeeded on ${RELEASE_SHA}"
