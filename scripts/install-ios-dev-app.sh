#!/bin/bash

set -euo pipefail

# Install the latest expo-dev-build iOS simulator app from GitHub Actions artifacts.
# Replaces the Runway-bucket flow with `gh run download` from expo-dev-build.yml.
#
# Verify step by step:
#   Step 1 (Resolve):  Run with --skipInstall and watch the resolved run id / artifact size.
#   Step 2 (Download): Inspect build/gh-expo-dev-build/ios/*.zip and build/MetaMask.app.
#   Step 3 (Install):  Run with --skip-download to install build/MetaMask.app on a booted simulator.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BUNDLE_ID="io.metamask.MetaMask"
APP_NAME="MetaMask.app"
# //\\// normalizes Windows backslash invocation paths (Yarn/Git Bash); no-op elsewhere.
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]//\\//}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_ROOT/build"
readonly DOWNLOAD_DIR="$BUILD_DIR/gh-expo-dev-build/ios"
readonly GHA_LIB="$SCRIPT_DIR/lib/download-gha-expo-dev-build.sh"
readonly DEVICE_TARGET_LIB="$SCRIPT_DIR/lib/dev-device-target.sh"

if ! [[ "$(pwd)" -ef "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:ios:dev${NC}"
  exit 1
fi

# shellcheck source=lib/download-gha-expo-dev-build.sh
source "$GHA_LIB"
# shellcheck source=lib/dev-device-target.sh
source "$DEVICE_TARGET_LIB"

GITHUB_REPO="$(resolve_github_repo)"
BRANCH="main"
RUN_ID=""
UNINSTALL=false
SKIP_DOWNLOAD=false
SKIP_INSTALL=false
ZIP_PATH=""
DOWNLOAD_SUCCESS=false

safe_rm() {
  local file="$1"
  if [[ -n "$file" && -f "$file" && "$file" == "$DOWNLOAD_DIR"/* ]]; then
    rm -f "$file"
  fi
}

safe_rm_dir() {
  local dir="$1"
  if [[ -n "$dir" && -d "$dir" && "$dir" == "$BUILD_DIR"/* ]]; then
    rm -rf "$dir"
  fi
}

cleanup() {
  if [[ "$DOWNLOAD_SUCCESS" == true ]]; then
    safe_rm "$ZIP_PATH"
  fi
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case $1 in
    --branch)
      [[ -n "${2:-}" ]] || { echo -e "${RED}❌ --branch requires a value${NC}"; exit 1; }
      BRANCH="$2"
      shift 2
      ;;
    --run|--run-id)
      [[ -n "${2:-}" ]] || { echo -e "${RED}❌ $1 requires a value${NC}"; exit 1; }
      RUN_ID="$2"
      shift 2
      ;;
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
      echo "Usage: $0 [--branch main] [--run RUN_ID] [--skip-download] [--skipInstall] [--uninstall]"
      echo "Targets IOS_SIMULATOR from .js.env (boots if needed); falls back to booted simulator."
      exit 1
      ;;
  esac
done

download_latest_app() {
  mkdir -p "$BUILD_DIR"

  echo -e "${BLUE}━━━ Step 1: Resolving expo-dev-build run ━━━${NC}"
  require_gh

  local resolved_run_id
  resolved_run_id="$(resolve_expo_dev_run "$IOS_SIMULATOR_ARTIFACT_NAME" "$BRANCH" "$RUN_ID")"
  echo "$resolved_run_id" > "$BUILD_DIR/expo-dev-build-run-id.txt"

  echo -e "${BLUE}━━━ Step 2: Downloading ${IOS_SIMULATOR_ARTIFACT_NAME} ━━━${NC}"
  rm -rf "$DOWNLOAD_DIR"
  mkdir -p "$DOWNLOAD_DIR"

  if ! download_artifact_from_run "$resolved_run_id" "$IOS_SIMULATOR_ARTIFACT_NAME" "$DOWNLOAD_DIR"; then
    echo -e "${RED}❌ Failed to download artifact${NC}"
    exit 1
  fi

  local zip_count
  zip_count="$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.zip" 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$zip_count" != "1" ]]; then
    echo -e "${RED}❌ Expected exactly one .zip in ${DOWNLOAD_DIR}, found ${zip_count}${NC}"
    find "$DOWNLOAD_DIR" -maxdepth 2 -type f || true
    exit 1
  fi

  ZIP_PATH="$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.zip" | head -1)"
  echo -e "${GREEN}✓ Downloaded: ${ZIP_PATH}${NC}"

  echo -e "${BLUE}━━━ Step 3: Extracting .app bundle ━━━${NC}"
  echo -e "${BLUE}Removing old app bundles in ${BUILD_DIR}...${NC}"
  while IFS= read -r old_app; do
    if [[ -n "$old_app" ]]; then
      echo -e "${YELLOW}  Removing: $(basename "$old_app")${NC}"
      safe_rm_dir "$old_app"
    fi
  done < <(find "$BUILD_DIR" -maxdepth 1 -type d -name "*.app" 2>/dev/null)

  # rename-artifacts.js zips with ditto --keepParent, so the .app is the zip top-level entry.
  ditto -x -k "$ZIP_PATH" "$BUILD_DIR"

  local extracted_app
  extracted_app="$(find "$BUILD_DIR" -maxdepth 1 -type d -name "*.app" | head -1 || true)"
  if [[ -z "$extracted_app" ]]; then
    echo -e "${RED}❌ No .app extracted into ${BUILD_DIR}${NC}"
    exit 1
  fi

  local target_app="$BUILD_DIR/$APP_NAME"
  if [[ "$extracted_app" != "$target_app" ]]; then
    safe_rm_dir "$target_app"
    mv "$extracted_app" "$target_app"
  fi

  echo -e "${GREEN}✓ Extracted to ${target_app}${NC}"
  DOWNLOAD_SUCCESS=true
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  download_latest_app
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Download complete. Installation skipped (--skipInstall).${NC}"
  exit 0
fi

echo -e "${BLUE}━━━ Step 4: Installing on simulator ━━━${NC}"

SIMULATOR_UDID=$(dev_resolve_ios_simulator_udid)
SIMULATOR_NAME=$(xcrun simctl list devices available -j | jq -r --arg udid "$SIMULATOR_UDID" '
  [.devices[][] | select(.udid == $udid)] | first | .name // "unknown"
')
echo -e "${GREEN}✓ Target simulator:${NC} ${SIMULATOR_NAME} (${SIMULATOR_UDID})"

APP_PATH="$BUILD_DIR/$APP_NAME"
if [[ ! -d "$APP_PATH" ]]; then
  echo -e "${RED}❌ No .app found at ${APP_PATH}${NC}"
  echo -e "${YELLOW}Run without --skip-download to download an app first${NC}"
  exit 1
fi

echo -e "${GREEN}Found app:${NC} $(basename "$APP_PATH")"

if [[ "$UNINSTALL" == true ]]; then
  echo -e "${YELLOW}Uninstalling existing app...${NC}"
  xcrun simctl uninstall "$SIMULATOR_UDID" "$BUNDLE_ID" 2>/dev/null || {
    echo -e "${YELLOW}App was not installed or already uninstalled${NC}"
  }
  echo -e "${GREEN}✓ Uninstall complete${NC}"
fi

echo -e "${BLUE}Installing app on simulator...${NC}"
xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
echo -e "${GREEN}✓ Successfully installed app on simulator!${NC}"
