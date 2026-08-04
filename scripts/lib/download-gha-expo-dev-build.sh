#!/bin/bash
# Shared helpers for downloading Expo dev build artifacts from GitHub Actions.
# Source this file from install-ios-dev-app.sh / install-android-dev-app.sh.

readonly EXPO_DEV_WORKFLOW_FILE="expo-dev-build.yml"
readonly EXPO_DEV_BUILD_NAME="main-dev-expo"
readonly IOS_SIMULATOR_ARTIFACT_NAME="ios-app-${EXPO_DEV_BUILD_NAME}"
readonly ANDROID_APK_ARTIFACT_NAME="android-apk-${EXPO_DEV_BUILD_NAME}"
readonly IOS_DEVICE_IPA_ARTIFACT_NAME="ios-ipa-${EXPO_DEV_BUILD_NAME}"
readonly DEFAULT_GITHUB_REPO="MetaMask/metamask-mobile"

export GH_PAGER=cat

require_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ $1 is required but not installed${NC}"
    echo -e "${YELLOW}$2${NC}"
    exit 1
  fi
}

resolve_github_repo() {
  local remote_url
  remote_url="$(git -C "$REPO_ROOT" config --get remote.origin.url 2>/dev/null || true)"
  if [[ "$remote_url" =~ github\.com[:/]([^/]+/[^/.]+) ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  echo "$DEFAULT_GITHUB_REPO"
}

require_gh() {
  require_cmd gh "Install with: brew install gh (macOS) / winget install GitHub.cli (Windows), then run: gh auth login"

  if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ gh is not authenticated${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    echo -e "${YELLOW}You need read access to GitHub Actions artifacts for ${GITHUB_REPO}.${NC}"
    exit 1
  fi
}

validate_numeric_run_id() {
  local run_id="$1"
  if [[ -z "$run_id" || ! "$run_id" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid run id: ${run_id:-<empty>} (must be numeric)${NC}" >&2
    return 1
  fi
}

run_has_artifact() {
  local run_id="$1"
  local artifact_name="$2"
  gh api "repos/${GITHUB_REPO}/actions/runs/${run_id}/artifacts" \
    --paginate \
    --jq ".artifacts[] | select(.expired == false and .name == \"${artifact_name}\") | .name" \
    | grep -q .
}

# expo-dev-build.yml now only builds when the @expo/fingerprint gate key changed (see
# resolve-dev-build job), skipping every other push to main. That means the run holding
# the latest artifact can sit arbitrarily far back in the run history, so walking the N
# most recent `gh run list` entries (the old approach) would routinely miss it. Query the
# artifact by its exact name instead — one API call, immune to however many runs were
# skipped in between — and read the producing run id straight off the artifact metadata.
find_latest_run_with_artifact() {
  local artifact_name="$1"
  local branch="$2"
  local run_id
  local matches
  local api_stderr
  api_stderr="$(mktemp)"

  # `--paginate --jq` runs the filter once per page, so a naive sort_by/first would only
  # reduce within a page rather than across all of them. Emit one "created_at|run_id"
  # line per matching artifact across every page instead, then reduce afterwards.
  if ! matches="$(gh api "repos/${GITHUB_REPO}/actions/artifacts?name=${artifact_name}&per_page=100" \
    --paginate \
    --jq ".artifacts[] | select(.expired == false and .workflow_run.head_branch == \"${branch}\") | \"\(.created_at)|\(.workflow_run.id)\"" \
    2>"$api_stderr")"; then
    # Distinguish a failed API call (auth, rate limit, network) from "no such artifact",
    # which would otherwise send the reader chasing the wrong problem entirely.
    echo -e "${RED}❌ Failed to query GitHub Actions artifacts for \"${artifact_name}\"${NC}" >&2
    cat "$api_stderr" >&2
    rm -f "$api_stderr"
    return 1
  fi
  rm -f "$api_stderr"

  # ISO 8601 timestamps are fixed-width, so a plain reverse string sort puts the newest
  # artifact first. LC_ALL=C keeps that true regardless of the caller's locale.
  #
  # `awk NR==1` rather than `head -1`: head exits after the first line, which can leave
  # sort writing into a closed pipe (exit 141) and, under the callers' `set -o pipefail`,
  # abort the whole script once the artifact list outgrows the pipe buffer. awk drains
  # the stream instead.
  run_id="$(printf '%s\n' "$matches" | LC_ALL=C sort -r | awk -F'|' 'NR == 1 { print $2 }')"

  if [[ -n "$run_id" && "$run_id" != "null" ]]; then
    echo "$run_id"
    return 0
  fi

  echo -e "${RED}❌ No live artifact named \"${artifact_name}\" found on branch \"${branch}\"${NC}" >&2
  echo -e "${YELLOW}The Expo Dev Build workflow only builds when native code changes; its artifacts may have expired.${NC}" >&2
  echo -e "${YELLOW}Re-run it (Actions > Expo Dev Build > Run workflow, with 'force_build' checked) or pass --run <id>.${NC}" >&2
  echo -e "${YELLOW}Browse recent runs: https://github.com/${GITHUB_REPO}/actions/workflows/${EXPO_DEV_WORKFLOW_FILE}${NC}" >&2
  return 1
}

resolve_expo_dev_run() {
  local artifact_name="$1"
  local branch="$2"
  local run_id_override="$3"
  local resolved_run_id

  if [[ -n "$run_id_override" ]]; then
    validate_numeric_run_id "$run_id_override" || return 1
    if ! run_has_artifact "$run_id_override" "$artifact_name"; then
      echo -e "${RED}❌ Run ${run_id_override} does not contain artifact \"${artifact_name}\"${NC}" >&2
      echo -e "${YELLOW}Inspect: https://github.com/${GITHUB_REPO}/actions/runs/${run_id_override}${NC}" >&2
      return 1
    fi
    resolved_run_id="$run_id_override"
    echo -e "${GREEN}✓ Using explicit run id: ${resolved_run_id}${NC}" >&2
  else
    echo -e "${BLUE}Looking up latest '${artifact_name}' artifact on '${branch}'...${NC}" >&2
    resolved_run_id="$(find_latest_run_with_artifact "$artifact_name" "$branch")" || return 1
    echo -e "${GREEN}✓ Latest run with artifact: ${resolved_run_id}${NC}" >&2
  fi

  print_run_summary "$resolved_run_id" >&2
  print_artifact_summary "$resolved_run_id" "$artifact_name" >&2
  echo "$resolved_run_id"
}

print_run_summary() {
  local run_id="$1"
  gh run view "$run_id" \
    --repo "$GITHUB_REPO" \
    --json databaseId,headSha,createdAt,url,displayTitle \
    --jq '"Run #\(.databaseId) | \(.displayTitle) | \(.headSha[0:7]) | \(.createdAt) | \(.url)"'
}

print_artifact_summary() {
  local run_id="$1"
  local artifact_name="$2"
  local artifact_meta
  local expired
  local artifact_size_bytes
  local artifact_digest
  local artifact_size_mb

  artifact_meta="$(gh api "repos/${GITHUB_REPO}/actions/runs/${run_id}/artifacts" \
    --paginate \
    --jq ".artifacts[] | select(.name==\"${artifact_name}\") | \"\(.expired)|\(.size_in_bytes)|\(.digest // \"\")\"" 2>/dev/null | head -1 || true)"

  if [[ -z "$artifact_meta" ]]; then
    echo -e "${RED}❌ Artifact '${artifact_name}' not found in run ${run_id}${NC}" >&2
    return 1
  fi

  IFS='|' read -r expired artifact_size_bytes artifact_digest <<< "$artifact_meta"

  if [[ "$expired" == "true" ]]; then
    echo -e "${RED}❌ Artifact '${artifact_name}' has expired for run ${run_id}${NC}" >&2
    echo -e "${YELLOW}Re-run the workflow or pass --run <id> for a newer run.${NC}" >&2
    return 1
  fi

  artifact_size_mb=$((artifact_size_bytes / 1024 / 1024))
  echo -e "${GREEN}✓ Artifact '${artifact_name}' size: ${artifact_size_mb}MB${NC}"
  if [[ -n "$artifact_digest" ]]; then
    echo -e "${GREEN}✓ Artifact digest: ${artifact_digest}${NC}"
  fi
  echo -e "${BLUE}🔗 https://github.com/${GITHUB_REPO}/actions/runs/${run_id}${NC}"
}

# Sidecar stores the GitHub Actions archive digest (sha256:...), not a hash of the
# extracted .apk/.app/.ipa — those do not match the API digest.
artifact_digest_cache_path() {
  local artifact_name="$1"
  echo "${BUILD_DIR}/gh-expo-dev-build/${artifact_name}.digest"
}

fetch_artifact_digest() {
  local run_id="$1"
  local artifact_name="$2"
  gh api "repos/${GITHUB_REPO}/actions/runs/${run_id}/artifacts" \
    --paginate \
    --jq ".artifacts[] | select(.expired == false and .name == \"${artifact_name}\") | .digest // empty" \
    2>/dev/null | head -1 || true
}

read_cached_artifact_digest() {
  local artifact_name="$1"
  local cache_path
  cache_path="$(artifact_digest_cache_path "$artifact_name")"
  if [[ -f "$cache_path" ]]; then
    tr -d '[:space:]' < "$cache_path"
  fi
}

write_cached_artifact_digest() {
  local artifact_name="$1"
  local digest="$2"
  local cache_path
  cache_path="$(artifact_digest_cache_path "$artifact_name")"

  if [[ -z "$digest" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "$cache_path")"
  printf '%s\n' "$digest" > "$cache_path"
}

# Returns 0 when download can be skipped (digest match + local installable present).
should_skip_artifact_download() {
  local run_id="$1"
  local artifact_name="$2"
  local stable_path="$3"
  local force_download="$4"
  local remote_digest
  local cached_digest

  if [[ "$force_download" == true ]]; then
    return 1
  fi

  if [[ ! -e "$stable_path" ]]; then
    return 1
  fi

  remote_digest="$(fetch_artifact_digest "$run_id" "$artifact_name")"
  if [[ -z "$remote_digest" ]]; then
    return 1
  fi

  cached_digest="$(read_cached_artifact_digest "$artifact_name")"
  if [[ -z "$cached_digest" || "$cached_digest" != "$remote_digest" ]]; then
    return 1
  fi

  echo -e "${GREEN}✓ Skipping download (digest match): ${remote_digest}${NC}" >&2
  echo -e "${GREEN}✓ Using local: ${stable_path}${NC}" >&2
  return 0
}

download_artifact_from_run() {
  local run_id="$1"
  local artifact_name="$2"
  local dest_dir="$3"

  mkdir -p "$dest_dir"
  gh run download "$run_id" \
    --repo "$GITHUB_REPO" \
    --name "$artifact_name" \
    --dir "$dest_dir"
}
