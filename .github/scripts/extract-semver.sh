#!/bin/bash

set -euo pipefail

# Extracts semver from a release branch name and flags whether it's an OTA hotfix.
#
# Supported branch shapes:
#   release/X.Y.Z       → semver=X.Y.Z, is_ota=false
#   release/X.Y.Z-ota   → semver=X.Y.Z, is_ota=true
#
# The `-ota` suffix is the signal for an OTA hotfix. Runway always increments the
# patch past any native tag on the same X.Y line, so the stripped semver is still
# unique (e.g. native v7.75.1 → OTA branch release/7.75.2-ota; git tag v7.75.2 is
# fresh). OTA_VERSION in app/constants/ota.ts is set to the stripped semver
# (v7.75.2), and the production OTA tag uses the same v-prefixed string.

ref_name="${GITHUB_REF#refs/heads/}"

if [[ "$ref_name" != release/* ]]; then
  echo "Error: Branch name must be release/X.Y.Z or release/X.Y.Z-ota. Got: $ref_name" >&2
  exit 1
fi

tail="${ref_name#release/}"

is_ota="false"
if [[ "$tail" == *-ota ]]; then
  is_ota="true"
  semver="${tail%-ota}"
else
  semver="$tail"
fi

# Strict SemVer core: no leading zeros on numeric identifiers (0 alone is fine).
if ! [[ "$semver" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "Error: Invalid semver in branch name: $ref_name (extracted: $semver; must be strict SemVer X.Y.Z with no leading zeros)" >&2
  exit 1
fi

echo "  semver-version: ${semver}"
echo "  is-ota: ${is_ota}"
echo "semver=${semver}" >> "$GITHUB_OUTPUT"
echo "is_ota=${is_ota}" >> "$GITHUB_OUTPUT"
