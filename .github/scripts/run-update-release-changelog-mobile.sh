#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh with OTA version handling.
#
# OTA hotfix detection: a two-digit patch in the branch version (e.g. release/7.77.01).
# auto-changelog rejects these as invalid SemVer (leading zeros are forbidden).
#
# This wrapper converts the Runway OTA version to a valid SemVer prerelease
# for the changelog tool, then replaces it back afterwards:
#   Runway 7.77.01  → SemVer 7.77.0-ota.1  → changelog generated → sed back to 7.77.01
#   Runway 7.77.21  → SemVer 7.77.2-ota.1  → changelog generated → sed back to 7.77.21
#
# Mapping (two-digit patch AB):  X.Y.AB → X.Y.A-ota.B
# Reverse:                       X.Y.A-ota.B → X.Y.AB
# Single-digit patches pass through unchanged.
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

# Extract version from branch name
if [[ "$RELEASE_BRANCH" =~ ^release/([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  RUNWAY_VERSION="${BASH_REMATCH[1]}"
else
  echo "Error: branch does not match release/X.Y.Z: ${RELEASE_BRANCH}" >&2
  exit 1
fi

PATCH="${RUNWAY_VERSION##*.}"

if [[ ${#PATCH} -eq 2 ]]; then
  # OTA hotfix: two-digit patch AB → X.Y.A-ota.B
  BASE_PATCH="${PATCH:0:1}"
  OTA_NUM="${PATCH:1:1}"
  SEMVER_VERSION="${RUNWAY_VERSION%.*}.${BASE_PATCH}-ota.${OTA_NUM}"
  CHANGELOG_BRANCH="release-changelog/${RUNWAY_VERSION}"

  echo "OTA hotfix detected: Runway ${RUNWAY_VERSION} → SemVer ${SEMVER_VERSION}"
  echo "Changelog branch: ${CHANGELOG_BRANCH}"

  # arg 1: real branch (git ops)  arg 5: changelog branch with Runway name  arg 6: valid SemVer for auto-changelog
  "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" "$CHANGELOG_BRANCH" "$SEMVER_VERSION"

  # Replace the SemVer prerelease back to Runway version in the generated changelog.
  # After the github-tools script we are on the changelog branch; it has already committed and pushed.
  if [[ -f CHANGELOG.md ]]; then
    SED_SAFE=$(printf '%s' "$SEMVER_VERSION" | sed 's/[.]/\\./g')
    if grep -q "${SEMVER_VERSION}" CHANGELOG.md; then
      echo "Replacing ${SEMVER_VERSION} → ${RUNWAY_VERSION} in CHANGELOG.md"
      sed -i "s/${SED_SAFE}/${RUNWAY_VERSION}/g" CHANGELOG.md
      git add CHANGELOG.md
      if ! git diff --cached --quiet; then
        git commit -m "chore: use Runway version ${RUNWAY_VERSION} in changelog (was ${SEMVER_VERSION})"
        git push origin HEAD
      fi
    fi
  fi
else
  # Regular release or single-digit hotfix: pass through unchanged
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
fi
