#!/bin/bash

set -euo pipefail

# Ensure SEMVER is provided via environment and assign
semver="${SEMVER:?SEMVER environment variable must be set}"

patch="${semver##*.}"
if [ "$patch" -gt 0 ]; then
  previous_ref="null"
  echo "Hotfix detected (patch=$patch > 0): setting previous-version-ref to 'null' (string)."
  echo "previous_ref=${previous_ref}" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Function to paginate and collect refs for a prefix
fetch_matching_refs() {
  local prefix="$1"
  local temp_file
  temp_file="$(mktemp)"
  local page=1
  echo "Fetching branches matching $prefix* (paginated)..." >&2
  while :; do
    echo "Fetching page $page for $prefix..." >&2
    local resp
    resp="$(mktemp)"
    url="https://api.github.com/repos/${GITHUB_REPOSITORY}/git/matching-refs/heads/${prefix}?per_page=100&page=${page}"
    curl -sS -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/vnd.github.v3+json" "$url" -o "$resp"

    cat "$resp" >> "$temp_file"

    local count
    count=$(jq length "$resp")
    if [ "$count" -lt 100 ]; then
      break
    fi
    page=$((page + 1))
    if [ "$page" -gt 100 ]; then
      echo "Error: Exceeded maximum pagination limit (100 pages) while fetching refs for prefix '$prefix'. This may indicate too many matching branches or an API issue." >&2
      exit 1
    fi
  done
  echo "$temp_file"
}

# Fetch only release/ branches
release_file=$(fetch_matching_refs "release/")

# Process: extract {name, semver} for matches, sort desc by semver
jq -s 'add | [ .[] | .ref | ltrimstr("refs/heads/") as $name | select($name | test("^release/[0-9]+\\.[0-9]+\\.[0-9]+$")) | {name: $name, semver: $name | ltrimstr("release/") } ] | sort_by( .semver | split(".") | map(tonumber) ) | reverse' "$release_file" > all_versions.json

# Filter to those with semver strictly lower than current and non-hotfix (patch==0)
jq --arg semver "$semver" '[ .[] | select( .semver as $v | $semver | split(".") as $c | $v | split(".") as $p | ( ($p[0] | tonumber) < ($c[0] | tonumber) or (($p[0] | tonumber) == ($c[0] | tonumber) and (($p[1] | tonumber) < ($c[1] | tonumber) or (($p[1] | tonumber) == ($c[1] | tonumber) and ($p[2] | tonumber) < ($c[2] | tonumber)))) ) and (($p[2] | tonumber) == 0) ) ]' all_versions.json > filtered_versions.json

# Select the highest lower: first in filtered list. If none found, fail.
if [ "$(jq length filtered_versions.json)" -eq 0 ]; then
  echo "Error: No lower non-hotfix versions found; cannot determine previous-version-ref." >&2
  echo "This likely indicates a missing prior minor release branch (e.g., release/X.(Y-1).0)." >&2
  exit 1
else
  highest_lower="$(jq -r '.[0].semver' filtered_versions.json)"
  previous_ref="$(jq -r '.[0].name' filtered_versions.json)"
  echo "Selected highest lower non-hotfix version: ${highest_lower} (branch: ${previous_ref})"
  echo "previous_ref=${previous_ref}" >> "$GITHUB_OUTPUT"
fi
