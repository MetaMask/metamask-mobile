#!/bin/bash
#
# Resolves the semver for Stable Branch Sync PRs.
#
# Default: the version at the tip of `stable` (from package.json), i.e. the
# release that was just merged — not the "next" release derived from remote
# release/* branches (see get-next-semver-version.sh for that).
#
# OTA hotfix releases (`release/X.Y.Z-ota`) intentionally do NOT bump
# `package.json` — the native shell stays at the parent native version and
# only `OTA_VERSION` in `app/constants/ota.ts` is bumped to `vX.Y.Z`. In that
# case we prefer `OTA_VERSION` so the resulting Stable Branch Sync PR is named
# after the actual released version (e.g. `7.77.1`) instead of the parent
# native version (e.g. `7.77.0`).

set -euo pipefail

if [ -z "${GITHUB_OUTPUT:-}" ]; then
  echo "GITHUB_OUTPUT is not set; this script is only meant to run in GitHub Actions." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PACKAGE_JSON="${ROOT}/package.json"
OTA_FILE="${ROOT}/app/constants/ota.ts"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo "Expected package.json at ${PACKAGE_JSON}" >&2
  exit 1
fi

NATIVE_VERSION=$(jq -r '.version | select(type == "string")' "$PACKAGE_JSON")

if [ -z "$NATIVE_VERSION" ] || [ "$NATIVE_VERSION" = "null" ]; then
  echo "Could not read .version from ${PACKAGE_JSON}" >&2
  exit 1
fi

if ! [[ "$NATIVE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version in ${PACKAGE_JSON}: ${NATIVE_VERSION} (expected numeric x.y.z)" >&2
  exit 1
fi

VERSION="$NATIVE_VERSION"

# Prefer OTA_VERSION when it is a real semver strictly greater than the native
# version. Sentinel values like `vX.XX.X` and any OTA value not matching
# X.Y.Z are ignored, so regular native releases keep using package.json.
if [ -f "$OTA_FILE" ]; then
  OTA_RAW=$(grep -E "^export const OTA_VERSION" "$OTA_FILE" \
    | sed -E "s/.*['\"](v?[^'\"]+)['\"].*/\1/" | head -n1 || true)
  OTA_VERSION="${OTA_RAW#v}"
  if [[ "$OTA_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    NEWEST=$(printf '%s\n%s\n' "$NATIVE_VERSION" "$OTA_VERSION" | sort -V | tail -n1)
    if [ "$NEWEST" = "$OTA_VERSION" ] && [ "$OTA_VERSION" != "$NATIVE_VERSION" ]; then
      echo "Detected OTA hotfix release: native=${NATIVE_VERSION}, OTA=${OTA_VERSION}; using ${OTA_VERSION}" >&2
      VERSION="$OTA_VERSION"
    fi
  fi
fi

echo "stable_version=${VERSION}" >> "$GITHUB_OUTPUT"
