#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BUNDLE_ID="io.metamask.MetaMask"
RUNWAY_DIR="./runway-downloads"
UNINSTALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --uninstall)
      UNINSTALL=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--uninstall]"
      exit 1
      ;;
  esac
done

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
