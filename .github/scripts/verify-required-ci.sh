#!/bin/bash

#
# verify-required-ci.sh
#
# Fails unless the required "Check all jobs pass" check (ci.yml) succeeded on a commit.
# This is the CI check the release/** ruleset requires. Only check runs created by GitHub
# Actions count, so another app cannot satisfy it with a check run of the same name.
#
# A commit can collect several runs (re-runs, later cancelled runs). The latest completed run
# that was not cancelled or skipped decides the result.
#
# Environment Variables (required):
#   COMMIT_SHA        - The commit to verify
#   GH_TOKEN          - GitHub API token with checks: read
#   GITHUB_REPOSITORY - Repository in format "owner/repo"
#
# Exits with code 0 on success, 1 on failure
#

set -euo pipefail

COMMIT_SHA="${COMMIT_SHA:?COMMIT_SHA environment variable must be set}"
GH_TOKEN="${GH_TOKEN:?GH_TOKEN environment variable must be set}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY environment variable must be set}"

GITHUB_ACTIONS_APP_ID=15368

RUNS=$(gh api "/repos/${GITHUB_REPOSITORY}/commits/${COMMIT_SHA}/check-runs?check_name=Check%20all%20jobs%20pass&filter=all" \
  --paginate \
  --jq ".check_runs[] | select(.app.id == ${GITHUB_ACTIONS_APP_ID}) | {status, conclusion, started_at, html_url}" |
  jq -s 'sort_by(.started_at)')

LATEST=$(jq -c 'map(select(.status == "completed" and .conclusion != "cancelled" and .conclusion != "skipped")) | last // empty' <<<"$RUNS")

if [[ -z "$LATEST" ]]; then
  if jq -e 'any(.status != "completed")' <<<"$RUNS" > /dev/null; then
    echo "::error::Required CI (Check all jobs pass) is still running on ${COMMIT_SHA}. Re-run once it succeeds."
  else
    # The aggregate job only creates its check run once every job it needs has finished.
    echo "::error::Required CI (Check all jobs pass) has no result on ${COMMIT_SHA} yet. Wait for ci.yml to finish on this commit, then re-run."
  fi
  exit 1
fi

CONCLUSION=$(jq -r '.conclusion' <<<"$LATEST")
URL=$(jq -r '.html_url' <<<"$LATEST")

if [[ "$CONCLUSION" != "success" ]]; then
  echo "::error::Required CI (Check all jobs pass) is '${CONCLUSION}' on ${COMMIT_SHA}: ${URL}"
  exit 1
fi

echo "✅ Required CI (Check all jobs pass) succeeded on ${COMMIT_SHA}: ${URL}"
