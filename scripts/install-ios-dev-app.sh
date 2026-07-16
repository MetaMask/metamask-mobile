#!/bin/bash

set -euo pipefail

# Install the latest expo-dev-build iOS app from GitHub Actions artifacts.
# Replaces the Runway-bucket flow with `gh run download` from expo-dev-build.yml.
#
# Simulator mode (default):
#   Downloads ios-app-main-dev-expo (.app bundle) and installs on a booted simulator.
#   Targets IOS_SIMULATOR from .js.env; falls back to the currently booted simulator.
#
# Device mode (--device):
#   Downloads ios-ipa-main-dev-expo (.ipa) and installs on a connected iPhone via devicectl.
#   Targets IOS_DEVICE from .js.env (name or UDID); falls back to single connected device.
#   Requires: Xcode 15+, device connected and trusted, Developer Mode enabled, device UDID
#   registered in the development-metamask provisioning profile.
#   After install, automatically launches the app connected to Metro (auto-detected LAN IP,
#   or METRO_HOST from .js.env) — no need to manually type this Mac's IP into the Expo Dev
#   Client screen. Note: the device and this Mac must be on the same Wi-Fi network — iOS
#   does not proxy Metro traffic over the USB cable the way Android's `adb reverse` does.
#   To reconnect without re-downloading (e.g. after restarting Metro), rerun with
#   --device --skip-download: this reinstalls the cached .ipa and relaunches connected.
#
# Verify step by step:
#   Step 1 (Resolve):  Run with --skipInstall and watch the resolved run id / artifact size.
#   Step 2 (Download): Inspect build/gh-expo-dev-build/ios/* and build/MetaMask.{app,ipa}.
#   Step 3 (Install):  Run with --skip-download to install without re-downloading.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BUNDLE_ID="io.metamask.MetaMask"
APP_NAME="MetaMask.app"
IPA_NAME="MetaMask.ipa"
DEV_CLIENT_URL_SCHEME="expo-metamask"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_ROOT/build"
readonly DOWNLOAD_DIR="$BUILD_DIR/gh-expo-dev-build/ios"
readonly GHA_LIB="$SCRIPT_DIR/lib/download-gha-expo-dev-build.sh"
readonly DEVICE_TARGET_LIB="$SCRIPT_DIR/lib/dev-device-target.sh"

if [[ "$(pwd)" != "$REPO_ROOT" ]]; then
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
DEVICE_MODE=false
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
    --device)
      DEVICE_MODE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--branch main] [--run RUN_ID] [--device] [--skip-download] [--skipInstall] [--uninstall]"
      echo "  (default) Targets IOS_SIMULATOR from .js.env (boots if needed); falls back to booted simulator."
      echo "  --device  Targets IOS_DEVICE from .js.env (name or UDID); falls back to single connected iPhone."
      echo "            Auto-connects to Metro after install. Add --skip-download to just reconnect."
      exit 1
      ;;
  esac
done

download_latest_app_simulator() {
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

download_latest_app_device() {
  mkdir -p "$BUILD_DIR"

  echo -e "${BLUE}━━━ Step 1: Resolving expo-dev-build run ━━━${NC}"
  require_gh

  local resolved_run_id
  resolved_run_id="$(resolve_expo_dev_run "$IOS_DEVICE_IPA_ARTIFACT_NAME" "$BRANCH" "$RUN_ID")"
  echo "$resolved_run_id" > "$BUILD_DIR/expo-dev-build-run-id.txt"

  echo -e "${BLUE}━━━ Step 2: Downloading ${IOS_DEVICE_IPA_ARTIFACT_NAME} ━━━${NC}"
  rm -rf "$DOWNLOAD_DIR"
  mkdir -p "$DOWNLOAD_DIR"

  if ! download_artifact_from_run "$resolved_run_id" "$IOS_DEVICE_IPA_ARTIFACT_NAME" "$DOWNLOAD_DIR"; then
    echo -e "${RED}❌ Failed to download artifact${NC}"
    exit 1
  fi

  local ipa_count
  ipa_count="$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.ipa" 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$ipa_count" != "1" ]]; then
    echo -e "${RED}❌ Expected exactly one .ipa in ${DOWNLOAD_DIR}, found ${ipa_count}${NC}"
    find "$DOWNLOAD_DIR" -maxdepth 2 -type f || true
    exit 1
  fi

  local downloaded_ipa
  downloaded_ipa="$(find "$DOWNLOAD_DIR" -maxdepth 1 -type f -name "*.ipa" | head -1)"
  echo -e "${GREEN}✓ Downloaded: ${downloaded_ipa}${NC}"

  echo -e "${BLUE}━━━ Step 3: Staging .ipa ━━━${NC}"
  local target_ipa="$BUILD_DIR/$IPA_NAME"
  rm -f "$target_ipa"
  cp "$downloaded_ipa" "$target_ipa"
  echo -e "${GREEN}✓ Staged to ${target_ipa}${NC}"
  DOWNLOAD_SUCCESS=true
}

# Relaunches the already-installed app on the connected device, deep-linked to this
# Mac's Metro server, so the engineer never has to type an IP into the Dev Client screen.
launch_device_app_connected_to_metro() {
  echo -e "${BLUE}━━━ Connecting app to Metro ━━━${NC}"

  local device_udid metro_host metro_port metro_url encoded_url payload_url
  device_udid=$(dev_resolve_ios_physical_device_udid)
  metro_host=$(dev_resolve_metro_host)
  metro_port="${WATCHER_PORT:-8081}"
  metro_url="http://${metro_host}:${metro_port}"
  encoded_url="$(jq -rn --arg v "$metro_url" '$v|@uri')"
  payload_url="${DEV_CLIENT_URL_SCHEME}://expo-development-client/?url=${encoded_url}"

  echo -e "${GREEN}✓ Target device UDID:${NC} ${device_udid}"
  echo -e "${GREEN}✓ Metro server:${NC} ${metro_url}"

  if ! xcrun devicectl device process launch --device "$device_udid" --terminate-existing --payload-url "$payload_url" "$BUNDLE_ID"; then
    echo -e "${RED}❌ Failed to launch app on device.${NC}"
    echo -e "${YELLOW}Make sure the app is installed and the device is unlocked.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ App launched and connected to Metro at ${metro_url}${NC}"
  echo -e "${YELLOW}Make sure \`yarn watch\` or \`yarn watch:clean\` is running so the bundler can respond.${NC}"
}

if [[ "$SKIP_DOWNLOAD" == false ]]; then
  if [[ "$DEVICE_MODE" == true ]]; then
    download_latest_app_device
  else
    download_latest_app_simulator
  fi
fi

if [[ "$SKIP_INSTALL" == true ]]; then
  echo -e "${GREEN}✓ Download complete. Installation skipped (--skipInstall).${NC}"
  exit 0
fi

# ─── Device install ───────────────────────────────────────────────────────────
if [[ "$DEVICE_MODE" == true ]]; then
  echo -e "${BLUE}━━━ Step 4: Installing on physical device ━━━${NC}"

  DEVICE_UDID=$(dev_resolve_ios_physical_device_udid)
  _tmpdevfile="$(mktemp /tmp/devicectl-info.XXXXXX.json)"
  xcrun devicectl list devices --json-output "$_tmpdevfile" > /dev/null 2>&1 || true
  DEVICE_NAME="$(jq -r --arg udid "$DEVICE_UDID" \
    '[.result.devices[] | select(.hardwareProperties.udid == $udid)] | first | .deviceProperties.name // "unknown"' \
    "$_tmpdevfile" 2>/dev/null || echo "unknown")"
  rm -f "$_tmpdevfile"

  echo -e "${GREEN}✓ Target device:${NC} ${DEVICE_NAME} (${DEVICE_UDID})"

  IPA_PATH="$BUILD_DIR/$IPA_NAME"
  if [[ ! -f "$IPA_PATH" ]]; then
    echo -e "${RED}❌ No .ipa found at ${IPA_PATH}${NC}"
    echo -e "${YELLOW}Run without --skip-download to download an IPA first${NC}"
    exit 1
  fi

  echo -e "${GREEN}Found IPA:${NC} $(basename "$IPA_PATH")"

  if [[ "$UNINSTALL" == true ]]; then
    echo -e "${YELLOW}Uninstalling existing app from device...${NC}"
    xcrun devicectl device uninstall app --device "$DEVICE_UDID" "$BUNDLE_ID" 2>/dev/null || {
      echo -e "${YELLOW}App was not installed or already uninstalled${NC}"
    }
    echo -e "${GREEN}✓ Uninstall complete${NC}"
  fi

  echo -e "${BLUE}Installing IPA on device...${NC}"
  if ! xcrun devicectl device install app --device "$DEVICE_UDID" "$IPA_PATH"; then
    echo -e "${RED}❌ Installation failed. Common causes:${NC}"
    echo -e "${YELLOW}  • Device UDID not registered in the 'development-metamask' provisioning profile${NC}"
    echo -e "${YELLOW}    → Ask a team member with Apple Developer access to add your device UDID${NC}"
    echo -e "${YELLOW}  • Developer Mode is disabled on the device${NC}"
    echo -e "${YELLOW}    → Settings → Privacy & Security → Developer Mode → Enable${NC}"
    echo -e "${YELLOW}  • Device is not trusted / paired with this Mac${NC}"
    echo -e "${YELLOW}    → Unlock the device and tap 'Trust' when prompted${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Successfully installed app on device!${NC}"

  launch_device_app_connected_to_metro
  exit 0
fi

# ─── Simulator install ────────────────────────────────────────────────────────
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
