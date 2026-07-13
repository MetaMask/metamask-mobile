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
  require_cmd gh "Install with: brew install gh (then run: gh auth login)"

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

find_latest_run_with_artifact() {
  local artifact_name="$1"
  local branch="$2"
  local run_id

  while IFS= read -r run_id; do
    [[ -z "$run_id" ]] && continue
    if run_has_artifact "$run_id" "$artifact_name"; then
      echo "$run_id"
      return 0
    fi
  done < <(
    gh run list \
      --repo "$GITHUB_REPO" \
      --workflow="$EXPO_DEV_WORKFLOW_FILE" \
      --branch="$branch" \
      --status=success \
      --limit=30 \
      --json databaseId \
      --jq '.[].databaseId'
  )

  echo -e "${RED}❌ No successful \"${EXPO_DEV_WORKFLOW_FILE}\" run on branch \"${branch}\" contains \"${artifact_name}\"${NC}" >&2
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
    echo -e "${BLUE}Looking up latest successful run on '${branch}' for ${EXPO_DEV_WORKFLOW_FILE}...${NC}" >&2
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
  local artifact_size_mb

  artifact_meta="$(gh api "repos/${GITHUB_REPO}/actions/runs/${run_id}/artifacts" \
    --paginate \
    --jq ".artifacts[] | select(.name==\"${artifact_name}\") | \"\(.expired)|\(.size_in_bytes)\"" 2>/dev/null | head -1 || true)"

  if [[ -z "$artifact_meta" ]]; then
    echo -e "${RED}❌ Artifact '${artifact_name}' not found in run ${run_id}${NC}" >&2
    return 1
  fi

  IFS='|' read -r expired artifact_size_bytes <<< "$artifact_meta"

  if [[ "$expired" == "true" ]]; then
    echo -e "${RED}❌ Artifact '${artifact_name}' has expired for run ${run_id}${NC}" >&2
    echo -e "${YELLOW}Re-run the workflow or pass --run <id> for a newer run.${NC}" >&2
    return 1
  fi

  artifact_size_mb=$((artifact_size_bytes / 1024 / 1024))
  echo -e "${GREEN}✓ Artifact '${artifact_name}' size: ${artifact_size_mb}MB${NC}"
  echo -e "${BLUE}🔗 https://github.com/${GITHUB_REPO}/actions/runs/${run_id}${NC}"
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
