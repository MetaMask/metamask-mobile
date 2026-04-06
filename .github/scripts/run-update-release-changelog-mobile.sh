#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh with OTA version handling.
#
# OTA hotfix detection: a two-digit patch in the branch version (e.g. release/7.77.01).
# auto-changelog rejects these as invalid SemVer (leading zeros are forbidden).
#
# This wrapper converts the Runway OTA version to a valid SemVer prerelease
# for the changelog tool:
#   Runway 7.77.01  → SemVer 7.77.0-ota.1
#   Runway 7.77.21  → SemVer 7.77.2-ota.1
#
# The SemVer prerelease format stays in CHANGELOG.md permanently. auto-changelog
# validates ALL version headers on every run, so non-SemVer versions like 7.77.01
# would break all future changelog generation (not just OTA runs).
#
# The Runway version (7.77.01) is used only in branch names, OTA_VERSION, and PR titles.
#
# Mapping (two-digit patch AB):  X.Y.AB → X.Y.A-ota.B
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

  echo "OTA hotfix detected: Runway ${RUNWAY_VERSION} → SemVer ${SEMVER_VERSION}"

  # Pass real branch (arg 1) for git ops, valid SemVer (arg 6) for auto-changelog.
  # Changelog branch (arg 5) uses the SemVer version so auto-changelog can find it on re-runs.
  "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" "" "$SEMVER_VERSION"
else
  # Regular release or single-digit hotfix: pass through unchanged
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
fi
