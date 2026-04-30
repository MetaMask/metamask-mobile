#!/usr/bin/env bash
# Updates OTA_VERSION in app/constants/ota.ts.
#
# With a semver second argument (OTA hotfix release workflow): sets OTA_VERSION to v<semver>
# exactly as provided (e.g. 7.75.2 -> v7.75.2). No normalization is applied.
# The OTA hotfix branch is release/X.Y.Z-ota; the bare X.Y.Z is passed here. Runway always
# increments the patch past any existing native tag on the same X.Y line, so v<X.Y.Z> is
# unique (no collision with a native release tag).
#
# Without semver (local / legacy): increments in place — vX.XX.X -> v0, vN -> v(N+1), vA.B.C -> vA.B.(C+1)
set -euo pipefail

FILE="${1:-app/constants/ota.ts}"
SEMVER="${2:-}"

if [[ ! -f "$FILE" ]]; then
  echo "Error: file not found: $FILE" >&2
  exit 1
fi

line=$(grep -E '^export const OTA_VERSION' "$FILE" || true)
if [[ -z "$line" ]]; then
  echo "Error: no OTA_VERSION export in $FILE" >&2
  exit 1
fi

current=$(sed -n "s/^export const OTA_VERSION: string = '\\([^']*\\)'.*/\\1/p" <<<"$line")
if [[ -z "$current" ]]; then
  echo "Error: could not parse OTA_VERSION from: $line" >&2
  exit 1
fi

new=""
if [[ -n "$SEMVER" ]]; then
  # Strict SemVer core: no leading zeros on numeric identifiers.
  if ! [[ "$SEMVER" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
    echo "Error: semver must be strict SemVer X.Y.Z (no leading zeros), got: ${SEMVER}" >&2
    exit 1
  fi
  new="v${SEMVER}"
  if [[ "$current" == "$new" ]]; then
    echo "OTA_VERSION already ${new}; no file change."
    exit 0
  fi
elif [[ "$current" == 'vX.XX.X' ]]; then
  new='v0'
elif [[ "$current" =~ ^v([0-9]+)$ ]]; then
  n="${BASH_REMATCH[1]}"
  new="v$((10#$n + 1))"
elif [[ "$current" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  a="${BASH_REMATCH[1]}"
  b="${BASH_REMATCH[2]}"
  c="${BASH_REMATCH[3]}"
  new="v${a}.${b}.$((10#$c + 1))"
else
  echo "Error: unsupported OTA_VERSION format (expected vX.XX.X, vN, or vA.B.C): ${current}" >&2
  exit 1
fi

tmp="$(mktemp)"
while IFS= read -r l || [[ -n "$l" ]]; do
  if [[ "$l" =~ ^export\ const\ OTA_VERSION:\ string\ = ]]; then
    printf '%s\n' "export const OTA_VERSION: string = '${new}';"
  else
    printf '%s\n' "$l"
  fi
done < "$FILE" > "$tmp"
mv "$tmp" "$FILE"

echo "Bumped OTA_VERSION: ${current} -> ${new}"
