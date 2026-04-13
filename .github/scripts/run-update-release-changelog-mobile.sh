#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh with OTA version handling.
#
# OTA hotfix detection: a multi-digit patch whose last digit is non-zero (e.g. release/7.77.01, release/7.77.11).
# auto-changelog rejects leading-zero patches as invalid SemVer.
#
# This wrapper converts the Runway OTA version to a valid SemVer prerelease
# for the changelog tool:
#   Runway 7.77.01  → SemVer 7.77.0-ota.1
#   Runway 7.77.21  → SemVer 7.77.2-ota.1
#   Runway 7.77.111 → SemVer 7.77.11-ota.1
#
# The SemVer prerelease format stays in CHANGELOG.md permanently. auto-changelog
# validates ALL version headers on every run, so non-SemVer versions like 7.77.01
# would break all future changelog generation (not just OTA runs).
#
# The Runway version (7.77.01) is used only in branch names, OTA_VERSION, and PR titles.
#
# Mapping: patch % 10 = OTA iteration, patch / 10 = base binary patch.
#   X.Y.{patch} → X.Y.{patch/10}-ota.{patch%10}
# Multi-digit patches with last digit 0 (e.g. 10, 20) are binary hotfixes, not OTA.
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

if [[ ${#PATCH} -ge 2 && $((10#$PATCH % 10)) -ne 0 ]]; then
  # OTA hotfix: last digit = OTA iteration, remaining digits = base binary patch
  BASE_PATCH=$((10#$PATCH / 10))
  OTA_NUM=$((10#$PATCH % 10))
  SEMVER_VERSION="${RUNWAY_VERSION%.*}.${BASE_PATCH}-ota.${OTA_NUM}"

  echo "OTA hotfix detected: Runway ${RUNWAY_VERSION} → SemVer ${SEMVER_VERSION}"

  # Pass real branch (arg 1) for git ops, valid SemVer (arg 6) for auto-changelog.
  # Changelog branch (arg 5) left empty so the tool auto-derives it from the SemVer version.
  "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" "" "$SEMVER_VERSION"

  # Fix comparison URLs on the changelog branch.
  # auto-changelog generates tag refs like "v7.76.0-ota.1" but the actual git tag
  # is "v7.76.01" (Runway format). Only URL tag refs carry the "v" prefix, so this
  # sed does not touch version headers (which are bare "7.76.0-ota.1" without "v").
  CL_BRANCH="release-changelog/${SEMVER_VERSION}"
  git fetch origin "$CL_BRANCH" 2>/dev/null || true
  if git rev-parse "origin/${CL_BRANCH}" >/dev/null 2>&1; then
    git checkout "$CL_BRANCH"
    if grep -q "v${SEMVER_VERSION}" CHANGELOG.md 2>/dev/null; then
      sed -i "s|v${SEMVER_VERSION}|v${RUNWAY_VERSION}|g" CHANGELOG.md
      if ! git diff --quiet CHANGELOG.md; then
        git add CHANGELOG.md
        git commit -m "fix: use Runway tag v${RUNWAY_VERSION} in changelog comparison URLs"
        git push origin "$CL_BRANCH"
        echo "Fixed changelog comparison URLs: v${SEMVER_VERSION} → v${RUNWAY_VERSION}"
      fi
    fi
  fi
else
  # Regular release or binary hotfix.
  # Normalize leading zeros in patch for strict SemVer (e.g. 00 → 0).
  NORMALIZED_PATCH=$((10#$PATCH))
  if [[ "$PATCH" != "$NORMALIZED_PATCH" ]]; then
    NORMALIZED_VERSION="${RUNWAY_VERSION%.*}.${NORMALIZED_PATCH}"
    echo "Normalizing patch for strict SemVer: Runway ${RUNWAY_VERSION} → ${NORMALIZED_VERSION}"
    # Pass real branch (arg 1) for git ops, normalized SemVer (arg 6) for auto-changelog.
    exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" "" "$NORMALIZED_VERSION"
  fi
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
fi
