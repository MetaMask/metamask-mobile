#!/usr/bin/env bash
# Invokes MetaMask github-tools update-release-changelog.sh with OTA version handling.
#
# Branch conventions:
#   release/X.Y.Z       → native release/hotfix; passes through unchanged (tool derives
#                         the version from package.json on the branch).
#   release/X.Y.Z-ota   → OTA hotfix; the -ota suffix exists only on the branch name.
#                         The changelog header and the production git tag both use the
#                         bare X.Y.Z. package.json on the OTA branch still carries the
#                         previous native version (OTA doesn't bump native), so we must
#                         pass X.Y.Z explicitly to auto-changelog. Runway always advances
#                         X.Y.Z past any existing native patch on the same X.Y line, so
#                         the bare header never collides with a prior native entry.
set -euo pipefail

RELEASE_BRANCH="${1:?release branch (e.g. release/7.75.0 or release/7.75.2-ota)}"
PLATFORM="${2:?platform (mobile|extension)}"
REPO_URL="${3:?repository https URL}"
PREV_REF="${4:-null}"

SCRIPT="${GITHUB_WORKSPACE:-.}/github-tools/.github/scripts/update-release-changelog.sh"
if [[ ! -f "$SCRIPT" ]]; then
  echo "Error: expected github-tools checkout at github-tools/ (missing ${SCRIPT})" >&2
  exit 1
fi

# Extract version and detect OTA suffix from branch name
if [[ "$RELEASE_BRANCH" =~ ^release/([0-9]+\.[0-9]+\.[0-9]+)(-ota)?$ ]]; then
  RUNWAY_VERSION="${BASH_REMATCH[1]}"
  OTA_SUFFIX="${BASH_REMATCH[2]}"
else
  echo "Error: branch does not match release/X.Y.Z or release/X.Y.Z-ota: ${RELEASE_BRANCH}" >&2
  exit 1
fi

if [[ -n "$OTA_SUFFIX" ]]; then
  # OTA hotfix: pass the bare X.Y.Z as the explicit SemVer version because package.json
  # on the OTA branch is still pinned to the prior native version.
  echo "OTA hotfix detected: branch ${RELEASE_BRANCH} → changelog header ${RUNWAY_VERSION}, tag v${RUNWAY_VERSION}"

  # Pass real branch (arg 1) for git ops, bare SemVer (arg 6) for auto-changelog.
  # Changelog branch (arg 5) left empty so the tool auto-derives it from the SemVer version.
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF" "" "$RUNWAY_VERSION"
else
  # Native release or hotfix: pass through; the tool derives the version from package.json.
  exec "$SCRIPT" "$RELEASE_BRANCH" "$PLATFORM" "$REPO_URL" "$PREV_REF"
fi
