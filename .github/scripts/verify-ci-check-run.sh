#!/usr/bin/env bash
# Verifies ci.yml's "Check all jobs pass" check run succeeded on RELEASE_SHA.
# Counterpart of metamask-extension/.github/scripts/verify-ci-checks.sh.
# Latest started_at wins: re-runs leave earlier runs, and filter=latest drops cancelled ones.

set -euo pipefail

if [[ "${SKIP_CI_GATE:-}" == "true" ]]; then
  actor=$(gh api "/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/events?per_page=100" \
    --jq '[.[] | select(.event == "labeled" and .label.name == "skip-ci-gate")] | last | .actor.login // "unknown"' \
    || true)
  {
    echo "### CI gate skipped"
    echo ""
    printf 'PR: https://github.com/%s/pull/%s\n\n' "${GITHUB_REPOSITORY}" "${PR_NUMBER}"
    printf 'Label skip-ci-gate added by %s\n' "${actor:-unknown}"
  } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  exit 0
fi

runs=$(gh api \
  -H "Accept: application/vnd.github+json" \
  "/repos/${GITHUB_REPOSITORY}/commits/${RELEASE_SHA}/check-runs?check_name=Check%20all%20jobs%20pass&filter=all&per_page=100" \
  --jq '[.check_runs[] | select(.app.slug == "github-actions")] | sort_by(.started_at)')

if [[ "$(jq 'length' <<<"${runs}")" -eq 0 ]]; then
  echo "::error::CI has not run on this SHA (${RELEASE_SHA})."
  exit 1
fi
if [[ "$(jq '[.[] | select(.status != "completed")] | length' <<<"${runs}")" -ne 0 ]]; then
  echo "::error::CI still running; re-run the OTA when it finishes."
  exit 1
fi
conclusion="$(jq -r '.[-1].conclusion' <<<"${runs}")"
if [[ "${conclusion}" != "success" ]]; then
  echo "::error::'Check all jobs pass' did not succeed (conclusion: ${conclusion})."
  exit 1
fi
echo "Check all jobs pass succeeded on ${RELEASE_SHA}"
