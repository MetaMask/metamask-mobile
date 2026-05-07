#!/bin/bash

set -euo pipefail

# Install the latest expo-dev-build Android APK from GitHub Actions artifacts.
# Replaces the Runway-bucket flow with a direct `gh run download` from
# .github/workflows/expo-dev-build.yml.
#
# The Android artifact uploads a single APK (no zipping required), so we just
# copy it to a stable path under build/.
#
# Verify step by step:
#   Step 1 (Resolve):  Run with --skipInstall and watch the resolved run id / artifact size.
#   Step 2 (Download): Inspect build/gh-expo-dev-build/android/*.apk and build/app-prod-debug.apk.
#   Step 3 (Install):  Run with --skip-download to install build/app-prod-debug.apk on a booted emulator.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO="MetaMask/metamask-mobile"
WORKFLOW="expo-dev-build.yml"
ARTIFACT_NAME="android-apk-main-dev-expo"
PACKAGE_ID="io.metamask"

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_ROOT/build"
readonly DOWNLOAD_DIR="$BUILD_DIR/gh-expo-dev-build/android"
readonly STABLE_APK="$BUILD_DIR/app-prod-debug.apk"

if [[ "$(pwd)" != "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:android:gh-expo-dev${NC}"
  exit 1
fi

UNINSTALL=false
SKIP_DOWNLOAD=false
SKIP_INSTALL=false
BRANCH="main"
RUN_ID=""

DOWNLOAD_SUCCESS=false

cleanup() {
  if [[ "$DOWNLOAD_SUCCESS" == true && -d "$DOWNLOAD_DIR" && "$DOWNLOAD_DIR" == "$BUILD_DIR"/* ]]; then
    rm -rf "$DOWNLOAD_DIR"
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
    --branch)
      if [[ -z "${2:-}" ]]; then
        echo -e "${RED}❌ --branch requires a value${NC}"
        exit 1
      fi
      BRANCH="$2"
      shift 2
      ;;
    --run)
      if [[ -z "${2:-}" ]]; then
        echo -e "${RED}❌ --run requires a value${NC}"
        exit 1
      fi
      RUN_ID="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--skip-download] [--skipInstall] [--uninstall] [--branch <name>] [--run <id>]"
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ $1 is required but not installed${NC}"
    echo -e "${YELLOW}$2${NC}"
    exit 1
  fi
}

download_latest_app() {
  echo -e "${BLUE}━━━ Step 1: Resolving expo-dev-build run ━━━${NC}"

  require_cmd gh "Install with: brew install gh (then run: gh auth login)"
  require_cmd jq "Install with: brew install jq"

  if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ gh CLI is not authenticated${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
  fi

  if [[ -n "$RUN_ID" ]]; then
    if [[ ! "$RUN_ID" =~ ^[0-9]+$ ]]; then
      echo -e "${RED}❌ Invalid run id: $RUN_ID (must be numeric)${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Using explicit run id: $RUN_ID${NC}"
  else
    echo -e "${BLUE}Looking up latest successful run on '$BRANCH' for $WORKFLOW...${NC}"
    RUN_ID=$(gh run list \
      --repo "$REPO" \
      --workflow "$WORKFLOW" \
      --branch "$BRANCH" \
      --status success \
      --limit 1 \
      --json databaseId \
      --jq '.[0].databaseId' || true)

    if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
      echo -e "${RED}❌ No successful '$WORKFLOW' runs found on branch '$BRANCH'${NC}"
      echo -e "${YELLOW}Trigger one via the workflow_dispatch UI or push to '$BRANCH', or pass --run <id>.${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Latest successful run id: $RUN_ID${NC}"
  fi

  echo -e "${BLUE}━━━ Step 2: Looking up artifact '$ARTIFACT_NAME' ━━━${NC}"
  local artifact_info
  artifact_info=$(gh api "repos/$REPO/actions/runs/$RUN_ID/artifacts" --paginate \
    --jq ".artifacts[] | select(.name==\"$ARTIFACT_NAME\")" || true)

  if [[ -z "$artifact_info" ]]; then
    echo -e "${RED}❌ Artifact '$ARTIFACT_NAME' not found in run $RUN_ID${NC}"
    echo -e "${YELLOW}Inspect: https://github.com/$REPO/actions/runs/$RUN_ID${NC}"
    exit 1
  fi

  local expired
  expired=$(echo "$artifact_info" | jq -r '.expired')
  if [[ "$expired" == "true" ]]; then
    echo -e "${RED}❌ Artifact '$ARTIFACT_NAME' has expired for run $RUN_ID${NC}"
    echo -e "${YELLOW}Re-run the workflow or pass --run <id> for a newer run.${NC}"
    exit 1
  fi

  local artifact_size_bytes
  artifact_size_bytes=$(echo "$artifact_info" | jq -r '.size_in_bytes')
  local artifact_size_mb=$((artifact_size_bytes / 1024 / 1024))
  echo -e "${GREEN}✓ Artifact size: ${artifact_size_mb}MB${NC}"
  echo -e "${BLUE}🔗 https://github.com/$REPO/actions/runs/$RUN_ID${NC}"

  echo -e "${BLUE}━━━ Step 3: Downloading $ARTIFACT_NAME ━━━${NC}"
  rm -rf "$DOWNLOAD_DIR"
  mkdir -p "$DOWNLOAD_DIR"

  if ! gh run download "$RUN_ID" --repo "$REPO" --name "$ARTIFACT_NAME" --dir "$DOWNLOAD_DIR"; then
    echo -e "${RED}❌ Failed to download artifact${NC}"
    exit 1
  fi

  # The Android artifact is uploaded as a single .apk (no zip), so we expect exactly one file.
  local apk_count
  apk_count=$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.apk" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$apk_count" != "1" ]]; then
    echo -e "${RED}❌ Expected exactly one .apk in $DOWNLOAD_DIR, found $apk_count${NC}"
    find "$DOWNLOAD_DIR" -maxdepth 2 -type f
    exit 1
  fi

  local downloaded_apk
  downloaded_apk=$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.apk" | head -1)
  echo -e "${GREEN}✓ Downloaded: $downloaded_apk${NC}"

  echo -e "${BLUE}━━━ Step 4: Copying to stable path ━━━${NC}"
  cp -f "$downloaded_apk" "$STABLE_APK"
  echo -e "${GREEN}✓ Copied to $STABLE_APK${NC}"
  DOWNLOAD_SUCCESS=true
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  download_latest_app
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Download complete. Installation skipped (--skipInstall). APK at $STABLE_APK${NC}"
  exit 0
fi

echo -e "${BLUE}━━━ Step 5: Installing on emulator/device ━━━${NC}"

require_cmd adb "Ensure Android SDK platform-tools are on PATH."

BOOTED_DEVICES=$(adb devices | grep -E '^[^ ]+\s+device$' | awk '{print $1}' || true)
if [[ -z "$BOOTED_DEVICES" ]]; then
  echo -e "${RED}❌ No emulator/device in 'device' state.${NC}"
  echo -e "${YELLOW}Start an Android emulator and run: adb devices${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Device(s):${NC}"
echo "$BOOTED_DEVICES" | while read -r dev; do echo "  $dev"; done

if [[ ! -f "$STABLE_APK" ]]; then
  echo -e "${RED}❌ No APK found at $STABLE_APK${NC}"
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
INSTALL_OUTPUT=$(adb install -r "$STABLE_APK" 2>&1)
INSTALL_EXIT=$?
set -e

echo "$INSTALL_OUTPUT"
if [[ $INSTALL_EXIT -ne 0 ]]; then
  if [[ "$INSTALL_OUTPUT" == *"INSTALL_FAILED_UPDATE_INCOMPATIBLE"* ]]; then
    echo -e "${YELLOW}Existing app was signed with a different key. Uninstall it first:${NC}"
    echo -e "  yarn install:android:gh-expo-dev --skip-download --uninstall"
  fi
  exit $INSTALL_EXIT
fi

echo -e "${GREEN}✓ Successfully installed app on emulator/device.${NC}"
