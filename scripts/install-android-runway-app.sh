#!/bin/bash

set -euo pipefail

# Install latest Android Runway build on emulator.
# Artifact: outputs.zip -> apk/prod/debug/app-prod-debug.apk
#
# Verify step by step:
#   Step 1 (API):     Run with --skip-download and no build/ yet → will fail at "No .apk found"; run without flags to test.
#   Step 2 (Download): Run with --skipInstall to only download and extract; then inspect build/outputs.zip and build/apk/prod/debug/app-prod-debug.apk
#   Step 3 (Install):  Run with --skip-download after Step 2 to install the already-downloaded APK on booted emulator.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PACKAGE_ID="io.metamask"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly RUNWAY_DIR="$REPO_ROOT/build"
RUNWAY_ANDROID_API_URL="https://app.runway.team/api/bucket/hykQxdZCEGgoyyZ9sBtkhli8wupv9PiTA6uRJf3Lh65FTECF1oy8vzkeXdmuJKhm7xGLeV35GzIT1Un7J5XkBADm5OhknlBXzA0CzqB767V36gi1F3yg3Uss/builds"

# Artifact name we expect from Android builds (hardcoded to avoid using API-derived paths)
ARTIFACT_NAME="outputs.zip"

if [[ "$(pwd)" != "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:android:runway${NC}"
  exit 1
fi

UNINSTALL=false
SKIP_DOWNLOAD=false
SKIP_INSTALL=false

ZIP_PATH=""
EXTRACT_DIR=""
DOWNLOAD_SUCCESS=false

safe_rm() {
  local file="$1"
  if [[ -n "$file" && -f "$file" && "$file" == "$RUNWAY_DIR"/* ]]; then
    rm -f "$file"
  fi
}

cleanup() {
  safe_rm "$ZIP_PATH"
  if [[ -n "$EXTRACT_DIR" && -d "$EXTRACT_DIR" && "$EXTRACT_DIR" == "$RUNWAY_DIR"/* ]]; then
    # Only remove the extracted outputs directory (e.g. build/apk), not the whole build dir
    if [[ "$EXTRACT_DIR" != "$RUNWAY_DIR" ]]; then
      rm -rf "$EXTRACT_DIR"
    fi
  fi
  if [[ "$DOWNLOAD_SUCCESS" == true ]]; then
    safe_rm "$RUNWAY_DIR/runway-android-builds-debug.json"
  fi
}
trap cleanup EXIT

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

# --- Step 1: Fetch builds from Runway API ---
download_latest_app() {
  echo -e "${BLUE}━━━ Step 1: Fetching builds from Runway API ━━━${NC}"
  mkdir -p "$RUNWAY_DIR"

  BUILDS_JSON=$(curl -s --connect-timeout 10 --max-time 30 "$RUNWAY_ANDROID_API_URL")

  if [[ -z "$BUILDS_JSON" ]]; then
    echo -e "${RED}❌ Failed to fetch builds from API${NC}"
    exit 1
  fi

  echo "$BUILDS_JSON" > "$RUNWAY_DIR/runway-android-builds-debug.json"
  echo -e "${GREEN}✓ API response saved to $RUNWAY_DIR/runway-android-builds-debug.json${NC}"

  if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed${NC}"
    echo -e "${YELLOW}Install with: brew install jq${NC}"
    exit 1
  fi

  echo -e "${BLUE}━━━ Looking for latest successful build with artifact: $ARTIFACT_NAME ━━━${NC}"
  BUILD_INFO=$(echo "$BUILDS_JSON" | jq -r --arg artifact "$ARTIFACT_NAME" '
    .data[] |
    select(.ciBuild.buildStatus == "success") |
    select(.additionalArtifacts | length > 0) |
    select(.additionalArtifacts | map(.fileName) | any(. == $artifact)) |
    . as $build |
    "\($build.id)|\($artifact)|\($build.ciBuild.buildIdentifier)"
  ' | head -1 || true)

  if [[ -z "$BUILD_INFO" ]]; then
    echo -e "${RED}❌ No successful builds with artifact \"$ARTIFACT_NAME\" found${NC}"
    echo -e "${YELLOW}Check $RUNWAY_DIR/runway-android-builds-debug.json for details${NC}"
    exit 1
  fi

  BUILD_ID=$(echo "$BUILD_INFO" | cut -d'|' -f1)
  FOUND_ARTIFACT=$(echo "$BUILD_INFO" | cut -d'|' -f2)
  BUILD_IDENTIFIER=$(echo "$BUILD_INFO" | cut -d'|' -f3)

  if [[ -z "$BUILD_ID" || ! "$BUILD_ID" =~ ^[a-zA-Z0-9_=-]+$ ]]; then
    echo -e "${RED}❌ Invalid build ID${NC}"
    exit 1
  fi
  # Ensure we only use our hardcoded artifact name in paths/URLs (never API-derived)
  if [[ -z "$FOUND_ARTIFACT" || "$FOUND_ARTIFACT" != "$ARTIFACT_NAME" ]]; then
    echo -e "${RED}❌ Unexpected artifact from API: $FOUND_ARTIFACT${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Found Build #$BUILD_IDENTIFIER, artifact: $FOUND_ARTIFACT${NC}"

  # --- Step 2: Download outputs.zip ---
  echo -e "${BLUE}━━━ Step 2: Downloading $ARTIFACT_NAME ━━━${NC}"
  DOWNLOAD_URL="https://app.runway.team/api/build/$BUILD_ID/download?artifactFileName=$ARTIFACT_NAME"
  ZIP_PATH="$RUNWAY_DIR/$ARTIFACT_NAME"

  HTTP_CODE=$(curl -L --connect-timeout 10 --max-time 600 -w "%{http_code}" -o "$ZIP_PATH" "$DOWNLOAD_URL")

  if [[ "$HTTP_CODE" -ne 200 ]]; then
    echo -e "${RED}❌ Download failed with HTTP code: $HTTP_CODE${NC}"
    safe_rm "$ZIP_PATH"
    exit 1
  fi

  echo -e "${GREEN}✓ Downloaded: $ZIP_PATH${NC}"

  # --- Step 3: Extract zip and locate APK ---
  # Use -j to junk paths (extract all files into EXTRACT_DIR) to prevent zip-slip attacks
  echo -e "${BLUE}━━━ Step 3: Extracting and locating APK ━━━${NC}"
  EXTRACT_DIR="$RUNWAY_DIR/extract_$$"
  mkdir -p "$EXTRACT_DIR"
  unzip -j -q -o "$ZIP_PATH" -d "$EXTRACT_DIR"

  APK_PATH="$EXTRACT_DIR/app-prod-debug.apk"
  if [[ ! -f "$APK_PATH" ]]; then
    echo -e "${RED}❌ APK not found at $APK_PATH${NC}"
    echo -e "${YELLOW}Contents of $EXTRACT_DIR:${NC}"
    find "$EXTRACT_DIR" -type f | head -20
    exit 1
  fi

  echo -e "${GREEN}✓ APK found: $APK_PATH${NC}"

  # Copy to a stable path under build/ so --skip-download can find it later
  STABLE_APK="$RUNWAY_DIR/app-prod-debug.apk"
  cp -f "$APK_PATH" "$STABLE_APK"
  echo -e "${GREEN}✓ Copied to $STABLE_APK${NC}"

  safe_rm "$ZIP_PATH"
  ZIP_PATH=""
  rm -rf "$EXTRACT_DIR"
  EXTRACT_DIR=""
  DOWNLOAD_SUCCESS=true
  echo -e "${GREEN}✓ Download and extraction complete.${NC}"
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  download_latest_app
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Installation skipped (--skipInstall). Verify APK at build/app-prod-debug.apk${NC}"
  exit 0
fi

# --- Step 4: Check emulator and install APK ---
echo -e "${BLUE}━━━ Step 4: Checking for running Android emulator ━━━${NC}"

if ! command -v adb &> /dev/null; then
  echo -e "${RED}❌ adb not found. Ensure Android SDK platform-tools are on PATH.${NC}"
  exit 1
fi

BOOTED_DEVICES=$(adb devices | grep -E '^[^ ]+\s+device$' | awk '{print $1}' || true)
if [[ -z "$BOOTED_DEVICES" ]]; then
  echo -e "${RED}❌ No emulator/device in 'device' state.${NC}"
  echo -e "${YELLOW}Start an Android emulator and run: adb devices${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Device(s):${NC}"
echo "$BOOTED_DEVICES" | while read -r dev; do echo "  $dev"; done

APK_PATH="$RUNWAY_DIR/app-prod-debug.apk"
if [[ ! -f "$APK_PATH" ]]; then
  echo -e "${RED}❌ No APK found at $APK_PATH${NC}"
  echo -e "${YELLOW}Run without --skip-download to download first${NC}"
  exit 1
fi

if [[ "$UNINSTALL" == true ]]; then
  echo -e "${YELLOW}Uninstalling existing app...${NC}"
  adb uninstall "$PACKAGE_ID" 2>/dev/null || true
  echo -e "${GREEN}✓ Uninstall complete${NC}"
fi

echo -e "${BLUE}Installing APK on device...${NC}"
set +e
INSTALL_OUTPUT=$(adb install -r "$APK_PATH" 2>&1)
INSTALL_EXIT=$?
set -e

echo "$INSTALL_OUTPUT"
if [[ $INSTALL_EXIT -ne 0 ]]; then
  if [[ "$INSTALL_OUTPUT" == *"INSTALL_FAILED_UPDATE_INCOMPATIBLE"* ]]; then
    echo -e "${YELLOW}Existing app was signed with a different key. Uninstall it first:${NC}"
    echo -e "  yarn install:android:runway --skip-download --uninstall"
  fi
  exit $INSTALL_EXIT
fi

echo -e "${GREEN}✓ Successfully installed app on emulator/device.${NC}"
