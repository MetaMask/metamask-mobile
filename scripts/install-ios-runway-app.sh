#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BUNDLE_ID="io.metamask.MetaMask"
# Get the repo root directory (script is in scripts/, so go up one level)
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly RUNWAY_DIR="$REPO_ROOT/runway-artifacts"
RUNWAY_API_URL="https://app.runway.team/api/bucket/aCddXOkg1p_nDryri-FMyvkC9KRqQeVT_12sf6Nw0u6iGygGo6BlNzjD6bOt-zma260EzAxdpXmlp2GQphp3TN1s6AJE4i6d_9V0Tv5h4pHISU49dFk=/builds"

# Ensure script is run from the repo root
if [[ "$(pwd)" != "$REPO_ROOT" ]]; then
  echo -e "${RED}❌ This script must be run from the repository root${NC}"
  echo -e "${YELLOW}Current directory: $(pwd)${NC}"
  echo -e "${YELLOW}Expected directory: $REPO_ROOT${NC}"
  echo -e "${YELLOW}Run: cd $REPO_ROOT && yarn install:ios:runway${NC}"
  exit 1
fi
UNINSTALL=false
SKIP_DOWNLOAD=false

# Track files for cleanup
ZIP_PATH=""
DOWNLOAD_SUCCESS=false

# Safe delete: only removes files inside RUNWAY_DIR
safe_rm() {
  local file="$1"
  # Only delete if file exists and path starts with RUNWAY_DIR
  if [[ -n "$file" && -f "$file" && "$file" == "$RUNWAY_DIR"/* ]]; then
    rm -f "$file"
  fi
}

# Safe delete directory: only removes directories inside RUNWAY_DIR
safe_rm_dir() {
  local dir="$1"
  # Only delete if directory exists and path starts with RUNWAY_DIR
  if [[ -n "$dir" && -d "$dir" && "$dir" == "$RUNWAY_DIR"/* ]]; then
    rm -rf "$dir"
  fi
}

# Cleanup on exit (error or interrupt)
cleanup() {
  safe_rm "$ZIP_PATH"
  # Only delete debug JSON on success (keep it for debugging on failure)
  if [[ "$DOWNLOAD_SUCCESS" == true ]]; then
    safe_rm "$RUNWAY_DIR/runway-builds-debug.json"
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
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--skip-download] [--uninstall]"
      exit 1
      ;;
  esac
done

# Download function
download_latest_app() {
  echo -e "${BLUE}📥 Downloading latest app from Runway...${NC}"
  
  # Create directory if it doesn't exist
  mkdir -p "$RUNWAY_DIR"
  
  echo -e "${BLUE}Fetching builds from Runway API...${NC}"
  BUILDS_JSON=$(curl -s --connect-timeout 10 --max-time 30 "$RUNWAY_API_URL")
  
  if [ -z "$BUILDS_JSON" ]; then
    echo -e "${RED}❌ Failed to fetch builds from API${NC}"
    exit 1
  fi
  
  # Save JSON for debugging
  echo "$BUILDS_JSON" > "$RUNWAY_DIR/runway-builds-debug.json"
  echo -e "${YELLOW}Saved builds data to $RUNWAY_DIR/runway-builds-debug.json${NC}"
  
  echo -e "${BLUE}Looking for latest successful build with artifacts...${NC}"
  
  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed${NC}"
    echo -e "${YELLOW}Install with: brew install jq${NC}"
    exit 1
  fi
  
  # Use jq to find the first successful build with a zip artifact
  # Returns: build_id|artifact_filename|build_identifier
  BUILD_INFO=$(echo "$BUILDS_JSON" | jq -r '
    .data[] | 
    select(.ciBuild.buildStatus == "success") | 
    select(.additionalArtifacts | length > 0) |
    select(.additionalArtifacts | map(.fileName) | any(endswith(".zip"))) |
    . as $build |
    ($build.additionalArtifacts | map(select(.fileName | endswith(".zip"))) | first | .fileName) as $zipFile |
    "\($build.id)|\($zipFile)|\($build.ciBuild.buildIdentifier)"
  ' | head -1 || true)
  
  if [[ -z "$BUILD_INFO" ]]; then
    echo -e "${RED}❌ No successful builds with zip artifacts found${NC}"
    echo -e "${YELLOW}Check $RUNWAY_DIR/runway-builds-debug.json for details${NC}"
    exit 1
  fi
  
  BUILD_ID=$(echo "$BUILD_INFO" | cut -d'|' -f1)
  ARTIFACT_NAME=$(echo "$BUILD_INFO" | cut -d'|' -f2)
  BUILD_IDENTIFIER=$(echo "$BUILD_INFO" | cut -d'|' -f3)
  
  # Validate ARTIFACT_NAME to prevent path traversal attacks
  if [[ -z "$ARTIFACT_NAME" || "$ARTIFACT_NAME" == *".."* || "$ARTIFACT_NAME" == *"/"* || ! "$ARTIFACT_NAME" =~ \.zip$ ]]; then
    echo -e "${RED}❌ Invalid artifact name: $ARTIFACT_NAME${NC}"
    exit 1
  fi
  
  # Validate BUILD_ID (should only contain alphanumeric, -, _, =)
  if [[ -z "$BUILD_ID" || ! "$BUILD_ID" =~ ^[a-zA-Z0-9_=-]+$ ]]; then
    echo -e "${RED}❌ Invalid build ID${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Found Build #$BUILD_IDENTIFIER${NC}"
  echo -e "${GREEN}  Artifact: $ARTIFACT_NAME${NC}"
  
  # Construct download URL (returns 302 redirect to S3)
  DOWNLOAD_URL="https://app.runway.team/api/build/$BUILD_ID/download?artifactFileName=$ARTIFACT_NAME"
  
  # Download the zip
  ZIP_PATH="$RUNWAY_DIR/$ARTIFACT_NAME"
  
  echo -e "${BLUE}Downloading $ARTIFACT_NAME...${NC}"
  HTTP_CODE=$(curl -L --connect-timeout 10 --max-time 600 -w "%{http_code}" -o "$ZIP_PATH" "$DOWNLOAD_URL")
  
  if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}❌ Download failed with HTTP code: $HTTP_CODE${NC}"
    safe_rm "$ZIP_PATH"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Downloaded: $ARTIFACT_NAME${NC}"
  
  # Extract the .app bundle
  # The zip contains the contents of the .app, so we create the .app directory first
  APP_NAME="${ARTIFACT_NAME%.zip}"
  
  # Validate APP_NAME ends with .app
  if [[ ! "$APP_NAME" =~ \.app$ ]]; then
    echo -e "${RED}❌ Invalid app name (must end with .app): $APP_NAME${NC}"
    exit 1
  fi
  
  EXTRACTED_APP_PATH="$RUNWAY_DIR/$APP_NAME"
  
  # Remove old .app bundles (keep only the new one)
  echo -e "${BLUE}Removing old app bundles...${NC}"
  while IFS= read -r old_app; do
    if [[ -n "$old_app" && "$old_app" != "$EXTRACTED_APP_PATH" ]]; then
      echo -e "${YELLOW}  Removing: $(basename "$old_app")${NC}"
      safe_rm_dir "$old_app"
    fi
  done < <(find "$RUNWAY_DIR" -name "*.app" -type d -maxdepth 1 2>/dev/null)
  
  # Remove existing app with same name (will be overwritten)
  if [[ -d "$EXTRACTED_APP_PATH" ]]; then
    echo -e "${YELLOW}  Overwriting: $APP_NAME${NC}"
    safe_rm_dir "$EXTRACTED_APP_PATH"
  fi
  
  echo -e "${BLUE}Extracting to $APP_NAME...${NC}"
  mkdir -p "$EXTRACTED_APP_PATH"
  ditto -x -k "$ZIP_PATH" "$EXTRACTED_APP_PATH"
  
  echo -e "${GREEN}✓ Successfully downloaded and extracted app!${NC}"
  
  # Cleanup zip file (debug json cleaned by trap on success)
  echo -e "${BLUE}Cleaning up...${NC}"
  safe_rm "$ZIP_PATH"
  ZIP_PATH=""  # Clear so trap doesn't try to delete again
  DOWNLOAD_SUCCESS=true
}

# Run download unless explicitly skipped
if [ "$SKIP_DOWNLOAD" = false ]; then
  download_latest_app
fi

echo -e "${GREEN}Checking for running iOS simulator...${NC}"

# Check if a simulator is booted
BOOTED_DEVICE=$(xcrun simctl list devices | grep "Booted" || true)

if [ -z "$BOOTED_DEVICE" ]; then
  echo -e "${RED}❌ No simulator is currently running.${NC}"
  echo -e "${YELLOW}Please start a simulator first and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Simulator is running:${NC}"
echo "  $BOOTED_DEVICE"

# Check if runway-artifacts directory exists
if [[ ! -d "$RUNWAY_DIR" ]]; then
  echo -e "${RED}❌ Directory $RUNWAY_DIR does not exist${NC}"
  echo -e "${YELLOW}Run without --skip-download to download an app first${NC}"
  exit 1
fi

# Find the .app file with the highest version number in runway-artifacts
APP_PATH=$(find "$RUNWAY_DIR" -name "*.app" -type d -maxdepth 1 2>/dev/null | sort -V | tail -1 || true)

if [[ -z "$APP_PATH" ]]; then
  echo -e "${RED}❌ No .app file found in $RUNWAY_DIR${NC}"
  echo -e "${YELLOW}Run without --skip-download to download an app first${NC}"
  exit 1
fi

echo -e "${GREEN}Found app:${NC} $(basename "$APP_PATH")"

# Uninstall if requested
if [ "$UNINSTALL" = true ]; then
  echo -e "${YELLOW}Uninstalling existing app...${NC}"
  xcrun simctl uninstall booted "$BUNDLE_ID" 2>/dev/null || {
    echo -e "${YELLOW}App was not installed or already uninstalled${NC}"
  }
  echo -e "${GREEN}✓ Uninstall complete${NC}"
fi

# Install the app
echo -e "${GREEN}Installing app on simulator...${NC}"
xcrun simctl install booted "$APP_PATH"

echo -e "${GREEN}✓ Successfully installed app on simulator!${NC}"