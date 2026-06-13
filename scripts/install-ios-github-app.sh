#!/bin/bash

set -euo pipefail

# Install latest iOS Expo Dev Build artifact from GitHub Actions on a booted simulator.
# Mirrors install-ios-runway-app.sh but pulls from GitHub instead of Runway.
#
# Flow:
#   1. Scrape https://github.com/MetaMask/metamask-mobile/actions/workflows/expo-dev-build.yml
#      for run paths matching /MetaMask/metamask-mobile/actions/runs/<id>.
#   2. Iterate through runs (newest first) and load each run page.
#   3. Locate the <tr data-artifact-id="..."> whose body contains the text
#      "ios-app-main-dev" (artifact link is rendered into a <tr>, not an <a>,
#      because public/unauthenticated HTML omits the download anchor).
#   4. Download the artifact zip via the GitHub REST API using the token from
#      `gh auth token` (i.e. the `gh` CLI must be installed and logged in).
#   5. Unwrap the GitHub artifact zip → unwrap the rename-artifacts.js double-zip
#      → extract the .app bundle into build/MetaMask.app.
#
# Auth requirement:
#   GitHub artifact downloads require auth even for public repos.
#   Run `gh auth login` once; the script reuses your gh session via `gh auth token`.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BUNDLE_ID="io.metamask.MetaMask"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_ROOT/build"

readonly GITHUB_REPO="MetaMask/metamask-mobile"
readonly WORKFLOW_URL="https://github.com/${GITHUB_REPO}/actions/workflows/expo-dev-build.yml"
readonly ARTIFACT_NAME="ios-app-main-dev"
# Cap how many runs we inspect when searching for an artifact (e.g. when the
# newest runs are still in progress and have no artifacts yet).
readonly MAX_RUNS_TO_INSPECT=10

if [[ "$(pwd)" != "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:ios:github${NC}"
  exit 1
fi

UNINSTALL=false
SKIP_DOWNLOAD=false
SKIP_INSTALL=false

# Track files for cleanup
OUTER_ZIP_PATH=""
TMP_EXTRACT_DIR=""
DOWNLOAD_SUCCESS=false

# Safe delete: only removes files inside BUILD_DIR
safe_rm() {
  local file="$1"
  if [[ -n "$file" && -f "$file" && "$file" == "$BUILD_DIR"/* ]]; then
    rm -f "$file"
  fi
}

# Safe delete directory: only removes directories inside BUILD_DIR (never BUILD_DIR itself)
safe_rm_dir() {
  local dir="$1"
  if [[ -n "$dir" && -d "$dir" && "$dir" == "$BUILD_DIR"/* && "$dir" != "$BUILD_DIR" ]]; then
    rm -rf "$dir"
  fi
}

cleanup() {
  safe_rm "$OUTER_ZIP_PATH"
  safe_rm_dir "$TMP_EXTRACT_DIR"
  if [[ "$DOWNLOAD_SUCCESS" == true ]]; then
    safe_rm "$BUILD_DIR/github-workflow-debug.html"
    safe_rm "$BUILD_DIR/github-run-debug.html"
  fi
}
trap cleanup EXIT

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --uninstall)
      UNINSTALL=true
      shift
      ;;
    --skip-download)
      SKIP_DOWNLOAD=true
      shift
      ;;
    --skipInstall)
      SKIP_INSTALL=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--skip-download] [--skipInstall] [--uninstall]"
      exit 1
      ;;
  esac
done

# Verify `gh` CLI is installed and authenticated. Errors out early so we never
# attempt a download we know will fail.
ensure_gh_auth() {
  if ! command -v gh >/dev/null 2>&1; then
    echo -e "${RED}❌ The GitHub CLI (gh) is required but was not found.${NC}"
    echo -e "${YELLOW}Install it from https://cli.github.com (e.g. brew install gh) and run: gh auth login${NC}"
    exit 1
  fi
  if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}❌ GitHub CLI is not authenticated.${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
  fi
}

# Resolve the GitHub auth token from the gh CLI session.
get_github_token() {
  gh auth token 2>/dev/null || true
}

download_latest_app() {
  echo -e "${BLUE}━━━ Step 0: Checking prerequisites ━━━${NC}"
  if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}❌ python3 is required for HTML parsing but was not found${NC}"
    exit 1
  fi
  ensure_gh_auth
  echo -e "${GREEN}✓ gh CLI is installed and authenticated${NC}"

  echo -e "${BLUE}━━━ Step 1: Scraping workflow page for runs ━━━${NC}"
  mkdir -p "$BUILD_DIR"

  local workflow_html
  workflow_html=$(curl -fsSL --connect-timeout 10 --max-time 30 "$WORKFLOW_URL" || true)
  if [[ -z "$workflow_html" ]]; then
    echo -e "${RED}❌ Failed to fetch $WORKFLOW_URL${NC}"
    exit 1
  fi
  echo "$workflow_html" > "$BUILD_DIR/github-workflow-debug.html"

  # Extract /MetaMask/metamask-mobile/actions/runs/<id> hrefs in document order,
  # dedupe while preserving order, and cap the iteration depth.
  local run_paths
  run_paths=$(printf '%s' "$workflow_html" \
    | grep -oE '/MetaMask/metamask-mobile/actions/runs/[0-9]+' \
    | awk '!seen[$0]++' \
    | head -"$MAX_RUNS_TO_INSPECT")

  if [[ -z "$run_paths" ]]; then
    echo -e "${RED}❌ No workflow runs found on $WORKFLOW_URL${NC}"
    echo -e "${YELLOW}Saved HTML to $BUILD_DIR/github-workflow-debug.html for inspection${NC}"
    exit 1
  fi

  local run_count
  run_count=$(printf '%s\n' "$run_paths" | wc -l | tr -d ' ')
  echo -e "${GREEN}✓ Found $run_count run(s); inspecting newest first${NC}"

  echo -e "${BLUE}━━━ Step 2: Locating run with $ARTIFACT_NAME artifact ━━━${NC}"

  local run_path run_url run_id artifact_id="" run_html
  while IFS= read -r run_path; do
    [[ -z "$run_path" ]] && continue
    run_url="https://github.com${run_path}"
    run_id="${run_path##*/}"
    echo -e "${BLUE}  • $run_url${NC}"

    run_html=$(curl -fsSL --connect-timeout 10 --max-time 30 "$run_url" || true)
    if [[ -z "$run_html" ]]; then
      echo -e "${YELLOW}    ⚠️  Failed to fetch run page (skipping)${NC}"
      continue
    fi
    echo "$run_html" > "$BUILD_DIR/github-run-debug.html"

    # Find the <tr data-artifact-id="ID"> whose body contains the artifact name.
    # NOTE: pass the HTML via an env var, not stdin — `python3 -` reads its
    # script from stdin, which would conflict with a piped HTML payload and
    # silently leave the script with an empty body.
    artifact_id=$(RUN_HTML="$run_html" python3 - "$ARTIFACT_NAME" <<'PY' || true
import os
import re
import sys

artifact_name = sys.argv[1]
html = os.environ.get('RUN_HTML', '')

row_pattern = re.compile(
    r'<tr\b[^>]*data-artifact-id="([0-9]+)"[^>]*>(.*?)</tr>',
    re.DOTALL,
)
text_pattern = re.compile(rf'>\s*{re.escape(artifact_name)}\s*<')

for match in row_pattern.finditer(html):
    if text_pattern.search(match.group(2)):
        print(match.group(1))
        break
PY
)

    if [[ -n "$artifact_id" ]]; then
      echo -e "${GREEN}    ✓ Run #$run_id has artifact id $artifact_id${NC}"
      break
    fi
    echo -e "${YELLOW}    ⚠️  No \"$ARTIFACT_NAME\" artifact in this run (likely still building or failed)${NC}"
  done <<< "$run_paths"

  if [[ -z "$artifact_id" ]]; then
    echo -e "${RED}❌ No \"$ARTIFACT_NAME\" artifact found in the latest $run_count run(s)${NC}"
    echo -e "${YELLOW}Inspect $BUILD_DIR/github-run-debug.html for the most recent run page${NC}"
    exit 1
  fi

  if [[ ! "$run_id" =~ ^[0-9]+$ || ! "$artifact_id" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid run id ($run_id) or artifact id ($artifact_id)${NC}"
    exit 1
  fi

  echo -e "${BLUE}━━━ Step 3: Downloading artifact via GitHub API ━━━${NC}"
  local token
  token="$(get_github_token)"
  if [[ -z "$token" ]]; then
    echo -e "${RED}❌ Could not read token from gh CLI (try: gh auth login)${NC}"
    exit 1
  fi

  OUTER_ZIP_PATH="$BUILD_DIR/${ARTIFACT_NAME}.zip"
  local download_url="https://api.github.com/repos/${GITHUB_REPO}/actions/artifacts/${artifact_id}/zip"

  local http_code
  http_code=$(curl -L --connect-timeout 10 --max-time 600 \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -w "%{http_code}" -o "$OUTER_ZIP_PATH" "$download_url")

  if [[ "$http_code" != "200" ]]; then
    echo -e "${RED}❌ Download failed (HTTP $http_code)${NC}"
    if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
      echo -e "${YELLOW}Your gh token may be missing the 'actions:read' scope.${NC}"
      echo -e "${YELLOW}Re-run: gh auth refresh -s actions:read${NC}"
    fi
    safe_rm "$OUTER_ZIP_PATH"
    exit 1
  fi

  echo -e "${GREEN}✓ Downloaded outer zip: $OUTER_ZIP_PATH${NC}"

  echo -e "${BLUE}━━━ Step 4: Unwrapping artifact and extracting .app bundle ━━━${NC}"

  TMP_EXTRACT_DIR="$BUILD_DIR/extract_$$"
  mkdir -p "$TMP_EXTRACT_DIR"

  # The number of zip layers depends on the workflow's rename-artifacts.js
  # output. Today it's two layers (GitHub wrapper → <base>.zip → .app/), but
  # historically it was three (GitHub wrapper → <base>.app.zip → <base>.zip →
  # .app/). Iteratively unwrap each layer (cap at 3 to avoid runaway loops)
  # until we find a *.app directory.
  local current_dir="$TMP_EXTRACT_DIR/layer_0"
  mkdir -p "$current_dir"
  unzip -j -q -o "$OUTER_ZIP_PATH" -d "$current_dir"

  local extracted_app=""
  local layer
  for layer in 1 2 3; do
    extracted_app=$(find "$current_dir" -maxdepth 1 -name '*.app' -type d | head -1 || true)
    if [[ -n "$extracted_app" ]]; then
      break
    fi

    local next_zip
    next_zip=$(find "$current_dir" -maxdepth 1 -type f -name '*.zip' | head -1 || true)
    if [[ -z "$next_zip" ]]; then
      echo -e "${RED}❌ No .app directory or further .zip found at layer $((layer - 1))${NC}"
      echo -e "${YELLOW}Contents of $current_dir:${NC}"
      find "$current_dir" -maxdepth 2
      exit 1
    fi

    echo -e "${BLUE}  layer $layer: extracting $(basename "$next_zip")${NC}"
    local next_dir="$TMP_EXTRACT_DIR/layer_${layer}"
    mkdir -p "$next_dir"
    # ditto handles macOS-specific zip metadata that `unzip` mangles.
    ditto -x -k "$next_zip" "$next_dir"
    current_dir="$next_dir"
  done

  if [[ -z "$extracted_app" ]]; then
    echo -e "${RED}❌ No .app directory found after 3 unwrap layers${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Found .app bundle: $(basename "$extracted_app")${NC}"

  # Always normalize to MetaMask.app to match install-ios-runway-app.sh and PREBUILT_IOS_APP_PATH.
  local APP_NAME="MetaMask.app"
  local EXTRACTED_APP_PATH="$BUILD_DIR/$APP_NAME"

  # Remove old .app bundles (keep only the new one)
  echo -e "${BLUE}Removing old app bundles...${NC}"
  while IFS= read -r old_app; do
    if [[ -n "$old_app" ]]; then
      echo -e "${YELLOW}  Removing: $(basename "$old_app")${NC}"
      safe_rm_dir "$old_app"
    fi
  done < <(find "$BUILD_DIR" -maxdepth 1 -name '*.app' -type d 2>/dev/null)

  mv "$extracted_app" "$EXTRACTED_APP_PATH"
  echo -e "${GREEN}✓ Extracted to: $EXTRACTED_APP_PATH${NC}"

  # Cleanup intermediates (debug HTML cleaned by trap on success)
  safe_rm "$OUTER_ZIP_PATH"; OUTER_ZIP_PATH=""
  safe_rm_dir "$TMP_EXTRACT_DIR"; TMP_EXTRACT_DIR=""
  DOWNLOAD_SUCCESS=true
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  download_latest_app
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Download complete. Installation skipped (--skipInstall flag).${NC}"
  exit 0
fi

echo -e "${BLUE}━━━ Step 5: Installing on iOS simulator ━━━${NC}"

BOOTED_DEVICE=$(xcrun simctl list devices | grep "Booted" || true)
if [[ -z "$BOOTED_DEVICE" ]]; then
  echo -e "${RED}❌ No simulator is currently running.${NC}"
  echo -e "${YELLOW}Please start a simulator first and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Simulator is running:${NC}"
echo "  $BOOTED_DEVICE"

if [[ ! -d "$BUILD_DIR" ]]; then
  echo -e "${RED}❌ Directory $BUILD_DIR does not exist${NC}"
  echo -e "${YELLOW}Run without --skip-download to download an app first${NC}"
  exit 1
fi

APP_PATH=$(find "$BUILD_DIR" -name "*.app" -type d -maxdepth 1 2>/dev/null | sort -V | tail -1 || true)
if [[ -z "$APP_PATH" ]]; then
  echo -e "${RED}❌ No .app file found in $BUILD_DIR${NC}"
  echo -e "${YELLOW}Run without --skip-download to download an app first${NC}"
  exit 1
fi

echo -e "${GREEN}Found app:${NC} $(basename "$APP_PATH")"

if [[ "$UNINSTALL" == true ]]; then
  echo -e "${YELLOW}Uninstalling existing app...${NC}"
  xcrun simctl uninstall booted "$BUNDLE_ID" 2>/dev/null || {
    echo -e "${YELLOW}App was not installed or already uninstalled${NC}"
  }
  echo -e "${GREEN}✓ Uninstall complete${NC}"
fi

echo -e "${GREEN}Installing app on simulator...${NC}"
xcrun simctl install booted "$APP_PATH"

echo -e "${GREEN}✓ Successfully installed app on simulator!${NC}"
