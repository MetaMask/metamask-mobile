#!/usr/bin/env bash
# Verifies the push-event ci.yml run on RELEASE_SHA has a successful
# "Check all jobs pass" job. Other workflow events do not satisfy the gate.
# Counterpart of metamask-extension/.github/scripts/verify-ci-checks.sh.

set -euo pipefail

# Every page is a plain GET. A non-array body or a failed gh call stops the script.
fetch_pages() {
  local url_prefix="$1"
  local array_key="$2"
  local combined='[]'
  local page=1
  local batch count

  while true; do
    batch=$(gh api -H "Accept: application/vnd.github+json" "${url_prefix}&page=${page}")
    if [[ -n "$array_key" ]]; then
      count=$(jq -r --arg key "$array_key" '.[$key] | length' <<<"$batch")
      combined=$(printf '%s\n%s\n' "$combined" "$batch" | jq -s --arg key "$array_key" '.[0] + .[1][$key]')
    else
      count=$(jq -r 'length' <<<"$batch")
      combined=$(printf '%s\n%s\n' "$combined" "$batch" | jq -s '.[0] + .[1]')
    fi
    if [[ "$count" -lt 100 ]]; then
      printf '%s\n' "$combined"
      return 0
    fi
    page=$((page + 1))
    if [[ "$page" -gt 20 ]]; then
      echo "::error::GitHub API page limit exceeded."
      return 1
    fi
  done
}

if [[ -n "${PR_NUMBER:-}" ]]; then
  labels=$(fetch_pages "/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/labels?per_page=100" "")
  if jq -e 'any(.[]; .name == "skip-ci-gate")' <<<"$labels" >/dev/null; then
    events=$(fetch_pages "/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/events?per_page=100" "")
    actor=$(jq -r '
      reduce .[] as $event (null;
        if ($event.event == "labeled" and ($event.label.name == "skip-ci-gate")) then
          ($event.actor.login // null)
        elif ($event.event == "unlabeled" and ($event.label.name == "skip-ci-gate")) then
          null
        else
          .
        end
      ) // empty
    ' <<<"$events")
    if [[ -z "$actor" ]]; then
      echo "::error::skip-ci-gate is present but the labeling event could not be resolved."
      exit 1
    fi
    {
      echo "### CI gate skipped"
      echo ""
      printf 'PR: https://github.com/%s/pull/%s\n\n' "${GITHUB_REPOSITORY}" "${PR_NUMBER}"
      printf 'Label skip-ci-gate added by %s\n' "$actor"
    } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
    exit 0
  fi
fi

runs=$(fetch_pages "/repos/${GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${RELEASE_SHA}&event=push&per_page=100" "workflow_runs")
selected=$(jq -c '
  [ .[] | select(.event == "push") ]
  | sort_by(.run_number, .run_attempt, .id)
  | last // empty
' <<<"$runs")
if [[ -z "$selected" ]]; then
  echo "::error::CI has not run on push for this SHA (${RELEASE_SHA})."
  exit 1
fi
if [[ "$(jq -r '.status' <<<"$selected")" != "completed" ]]; then
  echo "::error::Push CI is still running; re-run the OTA when it finishes."
  exit 1
fi

run_id=$(jq -r '.id' <<<"$selected")
run_attempt=$(jq -r '.run_attempt' <<<"$selected")
jobs=$(fetch_pages "/repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}/attempts/${run_attempt}/jobs?per_page=100" "jobs")
conclusion=$(jq -r '
  [ .[] | select(.name == "Check all jobs pass") ] | last | .conclusion // empty
' <<<"$jobs")
if [[ "$conclusion" != "success" ]]; then
  echo "::error::'Check all jobs pass' did not succeed (conclusion: ${conclusion:-none})."
  exit 1
fi
echo "Check all jobs pass succeeded on ${RELEASE_SHA}"
