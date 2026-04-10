#!/usr/bin/env bash
#
# CI helper: find previous "Bump version number" before current build on release/${SEMVER},
# run rc-cherry-pick-changelog.sh, write markdown to the given file (default: rc-cherry-pick-changelog.md).
#
# Environment (required):
#   SEMVER
#   ANDROID_BUILD_NUMBER or IOS_BUILD_NUMBER
#   GITHUB_REPOSITORY (owner/repo) for --repo-url
#
# Usage:
#   ./scripts/write-rc-cherry-pick-changelog-artifact.sh [output-file]
#
set -euo pipefail

OUT="${1:-rc-cherry-pick-changelog.md}"
SEMVER="${SEMVER:?SEMVER is required}"
REF="release/${SEMVER}"
CUR="${ANDROID_BUILD_NUMBER:-${IOS_BUILD_NUMBER:-}}"
[[ -n "${CUR}" ]] || {
  echo "ANDROID_BUILD_NUMBER or IOS_BUILD_NUMBER is required" >&2
  exit 1
}

REPO_URL="https://github.com/${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

sorted="$(
  git log "${REF}" --grep='Bump version number' --format='%s' 2>/dev/null |
    sed -n 's/.*Bump version number to \([0-9][0-9]*\).*/\1/p' |
    sort -n -u
)"

prev="$(
  echo "${sorted}" | awk -v c="${CUR}" '{ a[NR] = $0 } END {
    for (i = 1; i <= NR; i++) {
      if (a[i] == c && i > 1) { print a[i - 1]; exit }
    }
  }'
)"

if [[ -z "${prev}" ]]; then
  {
    echo "## RC cherry-picks: (range unavailable)"
    echo ""
    echo "_Could not find a previous bump before build ${CUR} on ${REF}._"
  } >"${OUT}"
  exit 0
fi

echo "Writing ${OUT} (build ${prev} → ${CUR}, ${REF})" >&2
if ! "${SCRIPT_DIR}/rc-cherry-pick-changelog.sh" "${prev}" "${CUR}" --ref "${REF}" --repo-url "${REPO_URL}" >"${OUT}"; then
  {
    echo "## RC cherry-picks: (generation failed)"
    echo ""
    echo "_rc-cherry-pick-changelog.sh exited with an error — see job logs._"
  } >"${OUT}"
fi
