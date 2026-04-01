#!/usr/bin/env bash
# Updates OTA_VERSION in app/constants/ota.ts.
#
# With a semver second argument (OTA hotfix release workflow): Runway may use a zero-padded patch
# in the branch name (e.g. 7.72.01). We normalize to strict SemVer and set OTA_VERSION to v7.72.1
# so tags, changelog compare links, and app metadata align with canonical X.Y.Z.
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

canonical_triple() {
  local s="$1"
  IFS=. read -r a b c <<<"$s" || return 1
  if [[ -z "${c:-}" ]]; then
    return 1
  fi
  echo "$((10#$a)).$((10#$b)).$((10#$c))"
}

new=""
if [[ -n "$SEMVER" ]]; then
  if ! [[ "$SEMVER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: semver must be numeric X.Y.Z, got: ${SEMVER}" >&2
    exit 1
  fi
  canonical="$(canonical_triple "$SEMVER")" || {
    echo "Error: could not normalize semver: ${SEMVER}" >&2
    exit 1
  }
  new="v${canonical}"
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

if [[ -n "${SEMVER:-}" ]] && [[ "$SEMVER" != "$canonical" ]]; then
  echo "Bumped OTA_VERSION: ${current} -> ${new} (Runway branch version ${SEMVER} -> canonical ${canonical})"
else
  echo "Bumped OTA_VERSION: ${current} -> ${new}"
fi
