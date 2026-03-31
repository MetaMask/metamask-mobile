#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh.
# OTA hotfix branches use zero-padded patches (e.g. release/101.1.02); strict SemVer forbids
# leading zeros in numeric segments, so auto-changelog must get 101.1.2 while the changelog
# branch stays release-changelog/101.1.02. Passes script args 5–6 when needed; see
# github-tools/.github/scripts/update-release-changelog.sh
set -euo pipefail

RELEASE_BRANCH="${1:?release branch (e.g. release/101.1.02)}"
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
  echo "OTA-style zero-padded patch: using --currentVersion ${normalized} and changelog branch release-changelog/${SEMVER}"
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" \
    "release-changelog/${SEMVER}" "$normalized"
fi

exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
