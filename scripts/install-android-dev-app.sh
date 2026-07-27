#!/bin/bash

set -euo pipefail

# Install the latest expo-dev-build Android APK from GitHub Actions artifacts.
# Replaces the Runway-bucket flow with `gh run download` from expo-dev-build.yml.
#
# Verify step by step:
#   Step 1 (Resolve):  Run with --skipInstall and watch the resolved run id / artifact size.
#   Step 2 (Download): Inspect build/gh-expo-dev-build/android/*.apk and build/metamask-dev.apk.
#   Step 3 (Install):  Run with --skip-download to install build/metamask-dev.apk on a booted emulator.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGE_ID="io.metamask"
# //\\// normalizes Windows backslash invocation paths (Yarn/Git Bash); no-op elsewhere.
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]//\\//}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_ROOT/build"
readonly DOWNLOAD_DIR="$BUILD_DIR/gh-expo-dev-build/android"
readonly STABLE_APK_PATH="$BUILD_DIR/metamask-dev.apk"
readonly GHA_LIB="$SCRIPT_DIR/lib/download-gha-expo-dev-build.sh"
readonly DEVICE_TARGET_LIB="$SCRIPT_DIR/lib/dev-device-target.sh"

if ! [[ "$(pwd)" -ef "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:android:dev${NC}"
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
DOWNLOAD_SUCCESS=false

cleanup() {
  if [[ "$DOWNLOAD_SUCCESS" == true && -d "$DOWNLOAD_DIR" && "$DOWNLOAD_DIR" == "$BUILD_DIR"/* ]]; then
    rm -rf "$DOWNLOAD_DIR"
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
      echo "Targets ADB_SERIAL or ANDROID_DEVICE from .js.env; falls back to first connected device."
      exit 1
      ;;
  esac
done

download_latest_app() {
  mkdir -p "$BUILD_DIR"

  echo -e "${BLUE}━━━ Step 1: Resolving expo-dev-build run ━━━${NC}"
  require_gh

  local resolved_run_id
  resolved_run_id="$(resolve_expo_dev_run "$ANDROID_APK_ARTIFACT_NAME" "$BRANCH" "$RUN_ID")"
  echo "$resolved_run_id" > "$BUILD_DIR/expo-dev-build-run-id.txt"

  echo -e "${BLUE}━━━ Step 2: Downloading ${ANDROID_APK_ARTIFACT_NAME} ━━━${NC}"
  rm -rf "$DOWNLOAD_DIR"
  mkdir -p "$DOWNLOAD_DIR"

  if ! download_artifact_from_run "$resolved_run_id" "$ANDROID_APK_ARTIFACT_NAME" "$DOWNLOAD_DIR"; then
    echo -e "${RED}❌ Failed to download artifact${NC}"
    exit 1
  fi

  local apk_count
  apk_count="$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.apk" 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$apk_count" != "1" ]]; then
    echo -e "${RED}❌ Expected exactly one .apk in ${DOWNLOAD_DIR}, found ${apk_count}${NC}"
    find "$DOWNLOAD_DIR" -maxdepth 2 -type f || true
    exit 1
  fi

  local downloaded_apk
  downloaded_apk="$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.apk" | head -1)"
  echo -e "${GREEN}✓ Downloaded: ${downloaded_apk}${NC}"

  echo -e "${BLUE}━━━ Step 3: Copying to stable path ━━━${NC}"
  cp -f "$downloaded_apk" "$STABLE_APK_PATH"
  echo -e "${GREEN}✓ Copied to ${STABLE_APK_PATH}${NC}"
  DOWNLOAD_SUCCESS=true
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  download_latest_app
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Download complete. Installation skipped (--skipInstall). APK at ${STABLE_APK_PATH}${NC}"
  exit 0
fi

echo -e "${BLUE}━━━ Step 4: Installing on emulator/device ━━━${NC}"

require_cmd adb "Ensure Android SDK platform-tools are on PATH."

ADB_TARGET_SERIAL=$(dev_resolve_android_adb_serial)
export ANDROID_SERIAL="$ADB_TARGET_SERIAL"
echo -e "${GREEN}✓ Target device:${NC} ${ADB_TARGET_SERIAL}"

if [[ ! -f "$STABLE_APK_PATH" ]]; then
  echo -e "${RED}❌ No APK found at ${STABLE_APK_PATH}${NC}"
  echo -e "${YELLOW}Run without --skip-download to download first${NC}"
  exit 1
fi

if [[ "$UNINSTALL" == true ]]; then
  echo -e "${YELLOW}Uninstalling existing app...${NC}"
  adb -s "$ADB_TARGET_SERIAL" uninstall "$PACKAGE_ID" 2>/dev/null || true
  echo -e "${GREEN}✓ Uninstall complete${NC}"
fi

echo -e "${BLUE}Installing APK on device...${NC}"
set +e
INSTALL_OUTPUT="$(adb -s "$ADB_TARGET_SERIAL" install -r "$STABLE_APK_PATH" 2>&1)"
INSTALL_EXIT=$?
set -e

echo "$INSTALL_OUTPUT"
if [[ $INSTALL_EXIT -ne 0 ]]; then
  if [[ "$INSTALL_OUTPUT" == *"INSTALL_FAILED_UPDATE_INCOMPATIBLE"* ]]; then
    echo -e "${YELLOW}Existing app was signed with a different key. Uninstall it first:${NC}"
    echo -e "  yarn install:android:dev --skip-download --uninstall"
  fi
  exit $INSTALL_EXIT
fi

echo -e "${GREEN}✓ Successfully installed app on emulator/device.${NC}"
