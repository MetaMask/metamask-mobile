#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BUNDLE_ID="io.metamask.MetaMask"
RUNWAY_DIR="./runway-downloads"
RUNWAY_API_URL="https://app.runway.team/api/bucket/aCddXOkg1p_nDryri-FMyvkC9KRqQeVT_12sf6Nw0u6iGygGo6BlNzjD6bOt-zma260EzAxdpXmlp2GQphp3TN1s6AJE4i6d_9V0Tv5h4pHISU49dFk=/builds"
UNINSTALL=false
SKIP_DOWNLOAD=false

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
  BUILDS_JSON=$(curl -s "$RUNWAY_API_URL")
  
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
    select(.additionalArtifacts[0].fileName | endswith(".zip")) |
    "\(.id)|\(.additionalArtifacts[0].fileName)|\(.ciBuild.buildIdentifier)"
  ' | head -1)
  
  if [ -z "$BUILD_INFO" ]; then
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
  
  echo -e "${GREEN}✓ Found Build #$BUILD_IDENTIFIER${NC}"
  echo -e "${GREEN}  Artifact: $ARTIFACT_NAME${NC}"
  
  # Construct download URL (returns 302 redirect to S3)
  DOWNLOAD_URL="https://app.runway.team/api/build/$BUILD_ID/download?artifactFileName=$ARTIFACT_NAME"
  
  # Download the zip
  ZIP_PATH="$RUNWAY_DIR/$ARTIFACT_NAME"
  
  echo -e "${BLUE}Downloading $ARTIFACT_NAME...${NC}"
  HTTP_CODE=$(curl -L -w "%{http_code}" -o "$ZIP_PATH" "$DOWNLOAD_URL")
  
  if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}❌ Download failed with HTTP code: $HTTP_CODE${NC}"
    rm -f "$ZIP_PATH"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Downloaded: $ARTIFACT_NAME${NC}"
  
  # Extract the .app bundle
  # The zip contains the contents of the .app, so we create the .app directory first
  APP_NAME="${ARTIFACT_NAME%.zip}"
  APP_PATH="$RUNWAY_DIR/$APP_NAME"
  
  echo -e "${BLUE}Extracting to $APP_NAME...${NC}"
  mkdir -p "$APP_PATH"
  ditto -x -k "$ZIP_PATH" "$APP_PATH"
  
  echo -e "${GREEN}✓ Successfully downloaded and extracted app!${NC}"
  
  # Cleanup downloaded files
  echo -e "${BLUE}Cleaning up...${NC}"
  rm -f "$ZIP_PATH"
  rm -f "$RUNWAY_DIR/runway-builds-debug.json"
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

# Find the .app file with the highest version number in runway-downloads
APP_PATH=$(find "$RUNWAY_DIR" -name "*.app" -type d -maxdepth 1 2>/dev/null | sort -V | tail -1)

if [ -z "$APP_PATH" ]; then
  echo -e "${RED}❌ No .app file found in $RUNWAY_DIR${NC}"
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
