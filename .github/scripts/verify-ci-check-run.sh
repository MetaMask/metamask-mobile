#!/usr/bin/env bash
# Verifies ci.yml's "Check all jobs pass" check run succeeded on RELEASE_SHA.
# Counterpart of metamask-extension/.github/scripts/verify-ci-checks.sh.
# Re-runs leave earlier check runs on the SHA, and filter=latest drops cancelled
# runs, so the latest started_at must have succeeded.
# Required env: GITHUB_TOKEN, GITHUB_REPOSITORY, RELEASE_SHA
# Optional env: SKIP_CI_GATE_REASON — written reason; skips the gate when set.

set -euo pipefail

for var in GITHUB_TOKEN GITHUB_REPOSITORY RELEASE_SHA; do
  if [[ -z "${!var:-}" ]]; then
    echo "::error::${var} not provided."
    exit 1
  fi
done

if [[ -n "${SKIP_CI_GATE_REASON:-}" ]]; then
  if [[ ! "${SKIP_CI_GATE_REASON}" =~ [^[:space:]] ]]; then
    echo "::error::skip_ci_gate requires a written reason."
    exit 1
  fi
  {
    echo "### CI gate skipped"
    echo ""
    printf 'SHA: %s\n\n' "${RELEASE_SHA}"
    printf 'Reason: %s\n' "${SKIP_CI_GATE_REASON}"
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
