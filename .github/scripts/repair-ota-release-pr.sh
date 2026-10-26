#!/usr/bin/env bash
#
# Fetch an OTA branch and make sure its pull request targets the pinned
# ota-base branch. Runs from a checkout of the default branch so the scripts
# here are the ones that landed with this change, even when the OTA branch
# was cut from an older tag.
#
# Env:
#   OTA_BRANCH          release/X.Y.Z-ota
#   GH_TOKEN
#   GITHUB_REPOSITORY
#   GIT_REMOTE          default origin

set -euo pipefail

OTA_BRANCH="${OTA_BRANCH:?OTA_BRANCH is required}"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

if ! [[ "$OTA_BRANCH" =~ ^release/((0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*))-ota$ ]]; then
  echo "::error::OTA branch must be release/X.Y.Z-ota (strict semver), got: ${OTA_BRANCH}" >&2
  exit 1
fi
SEMVER="${BASH_REMATCH[1]}"

# Full history of this branch. merge-base must be able to see the store tag
# even when the default-branch checkout is shallow. Do not pass --depth.
git fetch origin "refs/heads/${OTA_BRANCH}:refs/remotes/origin/${OTA_BRANCH}"

BASE=$(OTA_REF="refs/remotes/origin/${OTA_BRANCH}" bash "$SCRIPT_DIR/ensure-ota-base-branch.sh")

HEAD_BRANCH="$OTA_BRANCH" \
DESIRED_BASE="$BASE" \
SEMVER="$SEMVER" \
  bash "$SCRIPT_DIR/ensure-ota-pull-request.sh"
