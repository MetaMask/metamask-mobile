#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh.
# OTA hotfix branches use zero-padded patches in the branch name (e.g. release/7.72.01) for
# workflow detection only. Changelog tooling uses canonical SemVer (7.72.1): --currentVersion and
# branch release-changelog/7.72.1 so tags and compare links match OTA_VERSION in the app.
# See github-tools/.github/scripts/update-release-changelog.sh (args 5–6).
set -euo pipefail

RELEASE_BRANCH="${1:?release branch (e.g. release/7.72.01)}"
PLATFORM="${2:?platform (mobile|extension)}"
REPO_URL="${3:?repository https URL}"
PREV_REF="${4:-null}"

SCRIPT="${GITHUB_WORKSPACE:-.}/github-tools/.github/scripts/update-release-changelog.sh"
if [[ ! -f "$SCRIPT" ]]; then
  echo "Error: expected github-tools checkout at github-tools/ (missing ${SCRIPT})" >&2
  exit 1
fi

SEMVER="${RELEASE_BRANCH#release/}"
IFS=. read -r maj min pat <<<"$SEMVER" || true
if [[ -z "${pat:-}" ]]; then
  echo "Error: could not parse X.Y.Z from release branch: ${RELEASE_BRANCH}" >&2
  exit 1
fi

normalized="$((10#$maj)).$((10#$min)).$((10#$pat))"

if [[ "$pat" =~ ^0[0-9]+$ ]] && [[ "$SEMVER" != "$normalized" ]]; then
  echo "OTA zero-padded release branch ${SEMVER}: changelog release-changelog/${normalized} @ currentVersion ${normalized}"
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" \
    "release-changelog/${normalized}" "$normalized"
fi

exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
