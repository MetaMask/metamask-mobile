#!/bin/bash

set -euo pipefail

# Install the latest expo-dev-build iOS simulator app from GitHub Actions artifacts.
# Replaces the Runway-bucket flow with a direct `gh run download` from
# .github/workflows/expo-dev-build.yml.
#
# Verify step by step:
#   Step 1 (Resolve):  Run with --skipInstall and watch the resolved run id / artifact size.
#   Step 2 (Download): Inspect build/gh-expo-dev-build/ios/*.zip and the extracted build/MetaMask.app.
#   Step 3 (Install):  Run with --skip-download to install the already-downloaded build/MetaMask.app
#                       on a booted simulator.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO="MetaMask/metamask-mobile"
WORKFLOW="expo-dev-build.yml"
ARTIFACT_NAME="ios-app-main-dev-expo"
BUNDLE_ID="io.metamask.MetaMask"
APP_NAME="MetaMask.app"

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_ROOT/build"
readonly DOWNLOAD_DIR="$BUILD_DIR/gh-expo-dev-build/ios"

if [[ "$(pwd)" != "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:ios:gh-expo-dev${NC}"
  exit 1
fi

UNINSTALL=false
SKIP_DOWNLOAD=false
SKIP_INSTALL=false
BRANCH="main"
RUN_ID=""

ZIP_PATH=""
DOWNLOAD_SUCCESS=false

# Only delete files inside DOWNLOAD_DIR to avoid clobbering anything outside build/gh-expo-dev-build/ios.
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

  # The artifact contains the simulator zip created by scripts/rename-artifacts.js with
  # `ditto -c -k --sequesterRsrc --keepParent`, so the zip preserves the .app folder structure.
  local zip_count
  zip_count=$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.zip" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$zip_count" != "1" ]]; then
    echo -e "${RED}❌ Expected exactly one .zip in $DOWNLOAD_DIR, found $zip_count${NC}"
    find "$DOWNLOAD_DIR" -maxdepth 2 -type f
    exit 1
  fi
  ZIP_PATH=$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.zip" | head -1)
  echo -e "${GREEN}✓ Downloaded: $ZIP_PATH${NC}"

  echo -e "${BLUE}━━━ Step 4: Extracting .app bundle ━━━${NC}"
  echo -e "${BLUE}Removing old app bundles in $BUILD_DIR...${NC}"
  while IFS= read -r old_app; do
    if [[ -n "$old_app" ]]; then
      echo -e "${YELLOW}  Removing: $(basename "$old_app")${NC}"
      safe_rm_dir "$old_app"
    fi
  done < <(find "$BUILD_DIR" -maxdepth 1 -type d -name "*.app" 2>/dev/null)

  # ditto -x -k restores the .app bundle (with executable bits and resource forks intact).
  # --keepParent in the zip means the .app folder is the top-level entry, so we extract into
  # BUILD_DIR and pick up the resulting directory.
  ditto -x -k "$ZIP_PATH" "$BUILD_DIR"

  local extracted_app
  extracted_app=$(find "$BUILD_DIR" -maxdepth 1 -type d -name "*.app" | head -1)
  if [[ -z "$extracted_app" ]]; then
    echo -e "${RED}❌ No .app extracted into $BUILD_DIR${NC}"
    exit 1
  fi

  local target_app="$BUILD_DIR/$APP_NAME"
  if [[ "$extracted_app" != "$target_app" ]]; then
    safe_rm_dir "$target_app"
    mv "$extracted_app" "$target_app"
  fi

  echo -e "${GREEN}✓ Extracted to $target_app${NC}"
  DOWNLOAD_SUCCESS=true
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  download_latest_app
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Download complete. Installation skipped (--skipInstall).${NC}"
  exit 0
fi

echo -e "${BLUE}━━━ Step 5: Installing on simulator ━━━${NC}"

BOOTED_DEVICE=$(xcrun simctl list devices | grep "Booted" || true)
if [[ -z "$BOOTED_DEVICE" ]]; then
  echo -e "${RED}❌ No simulator is currently running.${NC}"
  echo -e "${YELLOW}Boot one (Xcode > Open Developer Tool > Simulator) and re-run.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Simulator is running:${NC}"
echo "  $BOOTED_DEVICE"

APP_PATH="$BUILD_DIR/$APP_NAME"
if [[ ! -d "$APP_PATH" ]]; then
  echo -e "${RED}❌ No .app found at $APP_PATH${NC}"
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

echo -e "${BLUE}Installing app on simulator...${NC}"
xcrun simctl install booted "$APP_PATH"

echo -e "${GREEN}✓ Successfully installed app on simulator!${NC}"
