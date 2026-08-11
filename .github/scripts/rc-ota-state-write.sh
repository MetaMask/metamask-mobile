#!/usr/bin/env bash
#
# rc-ota-state-write.sh
#
# Writes the Auto RC OTA state for a release branch to the CI state branch (default
# `ci-state/rc-auto-ota`). See rc-ota-state-read.sh for the schema.
#
# Two modes:
#   MODE=baseline      Record a new native baseline (after a successful native RC build)
#                      and reset ota_revision_count to 0.
#   MODE=ota-revision  Increment ota_revision_count (after a successful auto-OTA push),
#                      leaving the baseline fields untouched.
#
# The state branch is an orphan branch holding nothing but these JSON files, so it is
# never checked out over the working tree: the state repo is materialised in a temp
# directory via `git init` + a shallow fetch, which also avoids cloning app history.
# The branch is created as an orphan on first use.
#
# Because several release branches can write concurrently, the read-modify-commit-push
# cycle is retried against the latest remote tip on push rejection.
#
# Environment variables (required):
#   RELEASE_BRANCH      - Release branch the state belongs to (e.g. release/8.0.1)
#   GITHUB_TOKEN        - Token authorised to push to STATE_BRANCH
#   GITHUB_REPOSITORY   - owner/repo
#   MODE                - baseline | ota-revision
#
# Environment variables (required when MODE=baseline):
#   BASELINE_SHA         - Commit that was built natively
#   BASELINE_FINGERPRINT - Expo fingerprint at BASELINE_SHA
#   NATIVE_BUILD_NUMBER  - Build number the native build was stamped with
#
# Environment variables (optional):
#   STATE_BRANCH  - CI state branch to write to (default: ci-state/rc-auto-ota)
#   MAX_ATTEMPTS  - Push attempts before giving up (default: 5)
#
# Outputs (to GITHUB_OUTPUT):
#   ota_revision_count - Value after the write (0 for MODE=baseline)
#
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:?RELEASE_BRANCH environment variable must be set}"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN environment variable must be set}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY environment variable must be set}"
MODE="${MODE:?MODE environment variable must be set (baseline | ota-revision)}"
STATE_BRANCH="${STATE_BRANCH:-ci-state/rc-auto-ota}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-5}"

if [[ "$MODE" != "baseline" && "$MODE" != "ota-revision" ]]; then
  echo "::error title=Invalid MODE::MODE must be 'baseline' or 'ota-revision', got: ${MODE}"
  exit 1
fi

if [[ "$MODE" == "baseline" ]]; then
  BASELINE_SHA="${BASELINE_SHA:?BASELINE_SHA must be set when MODE=baseline}"
  BASELINE_FINGERPRINT="${BASELINE_FINGERPRINT:?BASELINE_FINGERPRINT must be set when MODE=baseline}"
  NATIVE_BUILD_NUMBER="${NATIVE_BUILD_NUMBER:-}"
fi

STATE_PATH="state/${RELEASE_BRANCH}.json"
AUTH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

cd "${WORK_DIR}"
git init --quiet
git remote add origin "${AUTH_URL}"
git config user.name 'metamaskbot'
git config user.email 'metamaskbot@users.noreply.github.com'

# Materialises STATE_BRANCH at its current remote tip, or an empty orphan branch when the
# branch does not exist yet. Called before every attempt so retries rebuild from the latest tip.
sync_state_branch() {
  rm -rf ./state
  if git fetch --quiet --depth 1 origin "${STATE_BRANCH}" 2>/dev/null; then
    git checkout --quiet -B "${STATE_BRANCH}" FETCH_HEAD
    echo "📥 Synced ${STATE_BRANCH} at $(git rev-parse --short HEAD)"
  else
    # --orphan on an empty repo leaves an unborn branch, so no `git rm` cleanup is needed.
    git checkout --quiet --orphan "${STATE_BRANCH}"
    echo "🌱 ${STATE_BRANCH} does not exist yet; will create it as an orphan branch"
  fi
}

NEW_REVISION_COUNT=0

# Rewrites STATE_PATH for the current MODE and sets NEW_REVISION_COUNT.
# Returns 1 (and leaves the file untouched) when the meaningful fields are unchanged,
# so re-running a workflow does not push a commit that only moves updated_at.
write_state_file() {
  local previous_json='{}'
  if [[ -f "${STATE_PATH}" ]]; then
    previous_json="$(cat "${STATE_PATH}")"
  fi

  local baseline_sha baseline_short_sha fingerprint native_build_number
  if [[ "$MODE" == "baseline" ]]; then
    # Only a genuinely new baseline commit resets the revision counter. Re-running the
    # native build for the commit that is already the baseline must not rewind the count,
    # or the next OTA would reuse a label that has already shipped.
    if [[ "$(jq -r '.baseline_sha // ""' <<<"$previous_json")" == "${BASELINE_SHA}" ]]; then
      NEW_REVISION_COUNT="$(jq -r '.ota_revision_count // 0' <<<"$previous_json")"
      return 1
    fi

    baseline_sha="${BASELINE_SHA}"
    baseline_short_sha="${BASELINE_SHA:0:7}"
    fingerprint="${BASELINE_FINGERPRINT}"
    native_build_number="${NATIVE_BUILD_NUMBER}"
    NEW_REVISION_COUNT=0
  else
    baseline_sha="$(jq -r '.baseline_sha // ""' <<<"$previous_json")"
    baseline_short_sha="$(jq -r '.baseline_short_sha // ""' <<<"$previous_json")"
    fingerprint="$(jq -r '.fingerprint // ""' <<<"$previous_json")"
    native_build_number="$(jq -r '.native_build_number // ""' <<<"$previous_json")"

    if [[ -z "$baseline_sha" ]]; then
      echo "::error title=No native baseline::Cannot record an OTA revision for ${RELEASE_BRANCH}: no baseline in ${STATE_PATH}."
      exit 1
    fi

    NEW_REVISION_COUNT="$(( $(jq -r '.ota_revision_count // 0' <<<"$previous_json") + 1 ))"
  fi

  local candidate_json
  candidate_json="$(jq -n \
    --arg baseline_sha "$baseline_sha" \
    --arg baseline_short_sha "$baseline_short_sha" \
    --arg fingerprint "$fingerprint" \
    --arg native_build_number "$native_build_number" \
    --argjson ota_revision_count "$NEW_REVISION_COUNT" \
    --arg updated_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      baseline_sha: $baseline_sha,
      baseline_short_sha: $baseline_short_sha,
      fingerprint: $fingerprint,
      native_build_number: $native_build_number,
      ota_revision_count: $ota_revision_count,
      updated_at: $updated_at
    }')"

  if [[ -f "${STATE_PATH}" ]] &&
    diff -q \
      <(jq -S 'del(.updated_at)' <<<"$previous_json") \
      <(jq -S 'del(.updated_at)' <<<"$candidate_json") >/dev/null 2>&1; then
    return 1
  fi

  mkdir -p "$(dirname "${STATE_PATH}")"
  printf '%s\n' "$candidate_json" > "${STATE_PATH}"
}

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  echo "🔄 Attempt ${attempt}/${MAX_ATTEMPTS} to update ${STATE_BRANCH}:${STATE_PATH}"

  sync_state_branch

  if ! write_state_file; then
    echo "✅ ${STATE_PATH} already records this state (ota_revision_count=${NEW_REVISION_COUNT}); nothing to push."
    break
  fi

  git add "${STATE_PATH}"
  if [[ "$MODE" == "baseline" ]]; then
    git commit --quiet -m "chore(rc-ota): baseline ${RELEASE_BRANCH} at ${BASELINE_SHA:0:7} (build ${NATIVE_BUILD_NUMBER:-unknown})"
  else
    git commit --quiet -m "chore(rc-ota): OTA revision ${NEW_REVISION_COUNT} for ${RELEASE_BRANCH}"
  fi

  if git push --quiet origin "HEAD:refs/heads/${STATE_BRANCH}"; then
    echo "✅ Pushed ${STATE_PATH} (ota_revision_count=${NEW_REVISION_COUNT})"
    break
  fi

  if [[ "${attempt}" -eq "${MAX_ATTEMPTS}" ]]; then
    echo "::error title=Auto RC OTA state push failed::Could not update ${STATE_BRANCH} after ${MAX_ATTEMPTS} attempts."
    exit 1
  fi

  echo "⚠️  Push rejected (concurrent update?); retrying against the new remote tip..."
  sleep $(( attempt * 2 ))
done

echo "ota_revision_count=${NEW_REVISION_COUNT}" >> "$GITHUB_OUTPUT"

{
  echo "### Auto RC OTA state updated"
  echo ""
  echo "- Branch: \`${RELEASE_BRANCH}\`"
  echo "- State: \`${STATE_BRANCH}:${STATE_PATH}\`"
  echo "- Mode: \`${MODE}\`"
  echo "- OTA revision count: \`${NEW_REVISION_COUNT}\`"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
