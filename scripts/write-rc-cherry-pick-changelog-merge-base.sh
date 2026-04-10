#!/usr/bin/env bash
#
# CI helper: merge-base(origin/main, HEAD) as --from, HEAD as --to — see rc-cherry-pick-changelog.sh.
# Requires a full clone of the release branch; run `git fetch origin main` first if origin/main
# is missing (e.g. shallow checkout of a single ref).
#
# Environment (required):
#   GITHUB_REPOSITORY (owner/repo) for --repo-url
#
# Usage:
#   ./scripts/write-rc-cherry-pick-changelog-merge-base.sh [output-file]
#
set -euo pipefail

OUT="${1:-rc-cherry-pick-changelog.md}"
REPO_URL="https://github.com/${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  echo "Fetching origin/main for merge-base..." >&2
  git fetch origin main
fi

MERGE_BASE="$(git merge-base HEAD origin/main)" || {
  {
    echo "## RC cherry-picks: (merge-base unavailable)"
    echo ""
    echo "_Could not compute merge-base between HEAD and origin/main._"
  } >"${OUT}"
  exit 0
}

echo "Writing ${OUT} (merge-base ${MERGE_BASE:0:7} → HEAD, ${REPO_URL})" >&2
if ! "${SCRIPT_DIR}/rc-cherry-pick-changelog.sh" \
  --from "${MERGE_BASE}" \
  --to "$(git rev-parse HEAD)" \
  --repo-url "${REPO_URL}" >"${OUT}"; then
  {
    echo "## RC cherry-picks: (generation failed)"
    echo ""
    echo "_rc-cherry-pick-changelog.sh exited with an error — see job logs._"
  } >"${OUT}"
fi
