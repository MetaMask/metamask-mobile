#!/usr/bin/env bash
#
# rc-ota-state-read.sh
#
# Reads the Auto RC OTA state for a release branch from the CI state branch
# (default `ci-state/rc-auto-ota`), which holds one JSON file per release branch at
# `state/<release-branch>.json`:
#
#   {
#     "baseline_sha":        "<commit of the last successful native RC build>",
#     "baseline_short_sha":  "<short form of baseline_sha>",
#     "fingerprint":         "<Expo fingerprint at baseline_sha>",
#     "native_build_number": "<build number that native build was stamped with>",
#     "ota_revision_count":  <highest auto-OTA revision reserved on top of that baseline>,
#     "updated_at":          "<ISO8601>"
#   }
#
# A missing state branch or missing file means no native baseline exists yet, so the
# caller must build natively (the bootstrap case right after a release cut).
#
# Environment variables (required):
#   RELEASE_BRANCH - Release branch the state belongs to (e.g. release/8.0.1)
#
# Environment variables (optional):
#   STATE_BRANCH   - CI state branch to read from (default: ci-state/rc-auto-ota)
#
# Outputs (to GITHUB_OUTPUT):
#   has_state, baseline_sha, baseline_short_sha, baseline_fingerprint,
#   native_build_number, ota_revision_count
#
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:?RELEASE_BRANCH environment variable must be set}"
STATE_BRANCH="${STATE_BRANCH:-ci-state/rc-auto-ota}"

STATE_PATH="state/${RELEASE_BRANCH}.json"

emit() {
  echo "$1=$2" >> "$GITHUB_OUTPUT"
}

emit_empty_state() {
  emit has_state false
  emit baseline_sha ''
  emit baseline_short_sha ''
  emit baseline_fingerprint ''
  emit native_build_number ''
  emit ota_revision_count 0
}

echo "🔍 Reading Auto RC OTA state for ${RELEASE_BRANCH} from ${STATE_BRANCH}:${STATE_PATH}"

if ! git fetch --quiet --depth 1 origin "${STATE_BRANCH}" 2>/dev/null; then
  echo "ℹ️  State branch ${STATE_BRANCH} does not exist yet — no native baseline recorded."
  emit_empty_state
  exit 0
fi

if ! STATE_JSON=$(git show "FETCH_HEAD:${STATE_PATH}" 2>/dev/null); then
  echo "ℹ️  No state file at ${STATE_PATH} — no native baseline recorded for this branch yet."
  emit_empty_state
  exit 0
fi

BASELINE_SHA=$(jq -r '.baseline_sha // ""' <<<"$STATE_JSON")
BASELINE_SHORT_SHA=$(jq -r '.baseline_short_sha // ""' <<<"$STATE_JSON")
BASELINE_FINGERPRINT=$(jq -r '.fingerprint // ""' <<<"$STATE_JSON")
NATIVE_BUILD_NUMBER=$(jq -r '.native_build_number // ""' <<<"$STATE_JSON")
OTA_REVISION_COUNT=$(jq -r '.ota_revision_count // 0' <<<"$STATE_JSON")

if [[ -z "$BASELINE_SHA" ]]; then
  echo "::warning title=Incomplete Auto RC OTA state::${STATE_PATH} has no baseline_sha; treating as no baseline."
  emit_empty_state
  exit 0
fi

echo "✅ Found baseline for ${RELEASE_BRANCH}:"
echo "  baseline_sha:        ${BASELINE_SHA}"
echo "  fingerprint:         ${BASELINE_FINGERPRINT:-<unknown>}"
echo "  native_build_number: ${NATIVE_BUILD_NUMBER:-<unknown>}"
echo "  ota_revision_count:  ${OTA_REVISION_COUNT}"

emit has_state true
emit baseline_sha "$BASELINE_SHA"
emit baseline_short_sha "$BASELINE_SHORT_SHA"
emit baseline_fingerprint "$BASELINE_FINGERPRINT"
emit native_build_number "$NATIVE_BUILD_NUMBER"
emit ota_revision_count "$OTA_REVISION_COUNT"
