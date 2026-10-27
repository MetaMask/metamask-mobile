#!/usr/bin/env bash
#
# Open or retarget the OTA pull request so it targets the pinned base branch.
#
# Does not merge the pull request. A retarget, or removal of pr-not-ready-for-e2e,
# closes and reopens the pull request so pull_request CI runs (edited base
# changes do not). PLAN_ONLY=true prints the plan and sets skip_bump without
# calling gh beyond `pr list`.
#
# Env:
#   HEAD_BRANCH     release/X.Y.Z-ota
#   DESIRED_BASE    ota-base/v<store version>
#   SEMVER          bare X.Y.Z from the branch name (the OTA version)
#   GH_TOKEN        token with pull request write
#   GITHUB_REPOSITORY
#   PLAN_ONLY       true skips mutations
#   ALLOW_CREATE    false leaves a missing pull request for Create Release
#                   Pull Request, so this script cannot win the race and skip
#                   the OTA_VERSION bump. Default true.
#   OTA_CONSTANTS_FILE
#                   app/constants/ota.ts path. skip_bump stays false while
#                   OTA_VERSION is the vX.XX.X sentinel, even if a pull request
#                   already exists.
#   GITHUB_OUTPUT   optional Actions output file (skip_bump)

set -euo pipefail

HEAD_BRANCH="${HEAD_BRANCH:?HEAD_BRANCH is required}"
DESIRED_BASE="${DESIRED_BASE:?DESIRED_BASE is required}"
SEMVER="${SEMVER:?SEMVER is required}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
OTA_CONSTANTS_FILE="${OTA_CONSTANTS_FILE:-app/constants/ota.ts}"
RELEASE_TAG="${DESIRED_BASE#ota-base/}"
TITLE="release: ${SEMVER} (OTA)"
OTA_VERSION_SENTINEL="vX.XX.X"

PRS=$(gh pr list --repo "$GITHUB_REPOSITORY" --head "$HEAD_BRANCH" --state open --json number,baseRefName,state,title)
PLAN=$(
  PRS_JSON="$PRS" \
  DESIRED_BASE="$DESIRED_BASE" \
  SEMVER="$SEMVER" \
  node "$SCRIPT_DIR/plan-ota-pull-request.mts"
)

ACTION=$(printf '%s' "$PLAN" | jq -r '.action')
PR_NUMBER=$(printf '%s' "$PLAN" | jq -r '.prNumber // empty')
REASON=$(printf '%s' "$PLAN" | jq -r '.reason')
mapfile -t CLOSE_NUMBERS < <(printf '%s' "$PLAN" | jq -r '.closePrNumbers[]?')

echo "${REASON}" >&2

# A pull request is not proof the branch was bumped. Create Release Pull Request
# skips the bump and the changelog when skip_bump=true, and production publish
# only checks that some pull request exists.
read_ota_version() {
  if [[ ! -f "$OTA_CONSTANTS_FILE" ]]; then
    printf ''
    return
  fi
  local line
  line=$(grep -E '^export const OTA_VERSION' "$OTA_CONSTANTS_FILE" | head -n 1 || true)
  if [[ -z "$line" ]]; then
    printf ''
    return
  fi
  sed -n "s/^export const OTA_VERSION: string = '\\([^']*\\)'.*/\\1/p" <<<"$line"
}

SKIP_BUMP=false
if [[ "$ACTION" == "use" || "$ACTION" == "retarget" ]]; then
  CURRENT_OTA=$(read_ota_version)
  if [[ -n "$CURRENT_OTA" && "$CURRENT_OTA" != "$OTA_VERSION_SENTINEL" ]]; then
    SKIP_BUMP=true
  else
    echo "OTA_VERSION is '${CURRENT_OTA:-missing}', not a release value. The bump and changelog still run." >&2
  fi
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "skip_bump=${SKIP_BUMP}" >> "$GITHUB_OUTPUT"
  echo "pr_action=${ACTION}" >> "$GITHUB_OUTPUT"
  echo "pr_number=${PR_NUMBER}" >> "$GITHUB_OUTPUT"
fi

if [[ "${PLAN_ONLY:-}" == "true" ]]; then
  printf '%s\n' "$PLAN"
  exit 0
fi

BODY=$(cat <<EOF
OTA hotfix: branch \`${HEAD_BRANCH}\`.

This pull request targets \`${DESIRED_BASE}\`, pinned to release tag \`${RELEASE_TAG}\` (the store binary recorded in \`package.json\`). It exists so CI and release-team approval can run against that tag. Do not merge it. Merging moves the pin off the tag and breaks the next OTA for this store version.

- Native semver and build version are **not** bumped.
- \`OTA_VERSION\` in \`app/constants/ota.ts\` is \`v${SEMVER}\`.
- CHANGELOG.md header and the production git tag both use bare \`${SEMVER}\` / \`v${SEMVER}\`. The \`-ota\` suffix is branch-only.
- Shipping publishes the head SHA. It does not merge into \`stable\`.
- JS fixes reach \`main\` through the normal fix pull request. Cherry-pick the changelog onto a different branch cut from \`stable\` if stable needs the OTA notes. That follow-up is not a ship gate.
EOF
)

remove_blocking_label() {
  local number="$1"
  local labels
  labels=$(gh pr view "$number" --repo "$GITHUB_REPOSITORY" --json labels --jq '.labels[].name')
  if printf '%s\n' "$labels" | grep -qx 'pr-not-ready-for-e2e'; then
    gh pr edit "$number" --repo "$GITHUB_REPOSITORY" --remove-label 'pr-not-ready-for-e2e' >&2
    echo "removed"
  fi
}

close_extras() {
  local number
  for number in "${CLOSE_NUMBERS[@]}"; do
    [[ -z "$number" ]] && continue
    gh pr close "$number" --repo "$GITHUB_REPOSITORY" --comment "MCRM-164: OTA validation uses #${PR_NUMBER} targeting \`${DESIRED_BASE}\`. This stable pull request cannot run pull_request CI once stable has moved on, so it is closed."
  done
}

reopen_for_ci() {
  local number="$1"
  local why="$2"
  gh pr close "$number" --repo "$GITHUB_REPOSITORY" --comment "$why"
  gh pr reopen "$number" --repo "$GITHUB_REPOSITORY"
}

case "$ACTION" in
  create)
    if [[ "${ALLOW_CREATE:-true}" != "true" ]]; then
      echo "No pull request yet. Leaving creation to Create Release Pull Request so the OTA_VERSION bump is not skipped." >&2
      exit 0
    fi
    created_url=$(gh pr create --repo "$GITHUB_REPOSITORY" --draft \
      --base "$DESIRED_BASE" --head "$HEAD_BRANCH" \
      --title "$TITLE" \
      --body "$BODY")
    created_number=$(printf '%s\n' "$created_url" | sed -n 's|.*/pull/\([0-9][0-9]*\).*|\1|p' | head -n 1)
    if [[ -z "$created_number" ]]; then
      echo "::error::Could not read the new pull request number from: ${created_url}" >&2
      exit 1
    fi
    # Old store tags still run auto-label on ota-base/**. Remove the label here
    # as well as on retarget, or Check all jobs pass fails because E2E was skipped.
    REMOVED=$(remove_blocking_label "$created_number" || true)
    if [[ "$REMOVED" == "removed" ]]; then
      reopen_for_ci "$created_number" "Reopening so pull_request CI runs without the pr-not-ready-for-e2e label (MCRM-164)."
      echo "Removed pr-not-ready-for-e2e from #${created_number}" >&2
    fi
    ;;
  retarget)
    gh pr edit "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" --base "$DESIRED_BASE" --body "$BODY"
    close_extras
    REMOVED=$(remove_blocking_label "$PR_NUMBER" || true)
    reopen_for_ci "$PR_NUMBER" "Reopening so pull_request CI runs against \`${DESIRED_BASE}\` (MCRM-164)."
    if [[ "$REMOVED" == "removed" ]]; then
      echo "Removed pr-not-ready-for-e2e from #${PR_NUMBER}" >&2
    fi
    ;;
  use)
    close_extras
    REMOVED=$(remove_blocking_label "$PR_NUMBER" || true)
    if [[ "$REMOVED" == "removed" ]]; then
      reopen_for_ci "$PR_NUMBER" "Reopening so pull_request CI runs without the pr-not-ready-for-e2e label (MCRM-164)."
    fi
    ;;
  *)
    echo "::error::${REASON}" >&2
    exit 1
    ;;
esac
