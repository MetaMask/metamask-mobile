#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh.
# Passes the version from the release branch directly — no normalization.
# If the version contains leading-zero patches (e.g. 7.73.01), auto-changelog
# will reject it because SemVer does not allow leading zeros in X.Y.Z.
set -euo pipefail

RELEASE_BRANCH="${1:?release branch (e.g. release/7.73.01)}"
PLATFORM="${2:?platform (mobile|extension)}"
REPO_URL="${3:?repository https URL}"
PREV_REF="${4:-null}"

SCRIPT="${GITHUB_WORKSPACE:-.}/github-tools/.github/scripts/update-release-changelog.sh"
if [[ ! -f "$SCRIPT" ]]; then
  echo "Error: expected github-tools checkout at github-tools/ (missing ${SCRIPT})" >&2
  exit 1
fi

exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
