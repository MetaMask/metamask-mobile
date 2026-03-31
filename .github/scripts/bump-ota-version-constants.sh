#!/usr/bin/env bash
# Increments OTA_VERSION in app/constants/ota.ts (used for OTA hotfix release PRs).
# Supports: vX.XX.X (no OTA yet) -> v0, vN -> v(N+1), vA.B.C -> vA.B.(C+1)
set -euo pipefail

FILE="${1:-app/constants/ota.ts}"

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

# Sentinel: native build has not shipped an OTA yet; first OTA hotfix establishes v0 (then v1, v2, …).
if [[ "$current" == 'vX.XX.X' ]]; then
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
