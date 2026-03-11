#!/bin/bash
# Maestro Visual Regression - Baseline Update Script
# This script captures new baseline screenshots for visual regression testing
#
# Usage:
#   ./update-baselines.sh              # Update all baselines
#   ./update-baselines.sh onboarding   # Update only onboarding baselines
#   ./update-baselines.sh --ios        # Update iOS baselines only
#   ./update-baselines.sh --android    # Update Android baselines only

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$MAESTRO_DIR")"
BASELINES_DIR="$MAESTRO_DIR/baselines"
FLOWS_DIR="$MAESTRO_DIR/flows"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PLATFORM="ios"
FLOW_FILTER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ios)
            PLATFORM="ios"
            shift
            ;;
        --android)
            PLATFORM="android"
            shift
            ;;
        --all)
            PLATFORM="all"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options] [flow-name]"
            echo ""
            echo "Options:"
            echo "  --ios       Update iOS baselines only (default)"
            echo "  --android   Update Android baselines only"
            echo "  --all       Update baselines for both platforms"
            echo "  -h, --help  Show this help message"
            echo ""
            echo "Arguments:"
            echo "  flow-name   Optional: specific flow folder to update (onboarding, wallet, send, settings)"
            exit 0
            ;;
        *)
            FLOW_FILTER="$1"
            shift
            ;;
    esac
done

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
    echo -e "${RED}Error: Maestro CLI is not installed.${NC}"
    echo "Install it with: curl -Ls 'https://get.maestro.mobile.dev' | bash"
    exit 1
fi

echo -e "${GREEN}=== Maestro Visual Regression - Baseline Update ===${NC}"
echo ""

# Determine which flows to run
if [ -n "$FLOW_FILTER" ]; then
    FLOW_PATH="$FLOWS_DIR/$FLOW_FILTER"
    if [ ! -d "$FLOW_PATH" ]; then
        echo -e "${RED}Error: Flow directory not found: $FLOW_FILTER${NC}"
        echo "Available flows:"
        ls -1 "$FLOWS_DIR"
        exit 1
    fi
    echo "Updating baselines for: $FLOW_FILTER"
else
    FLOW_PATH="$FLOWS_DIR"
    echo "Updating all baselines"
fi

echo "Platform: $PLATFORM"
echo ""

# Function to run flows and capture baselines
run_baseline_capture() {
    local platform=$1
    local flow_path=$2
    
    echo -e "${YELLOW}Capturing baselines for $platform...${NC}"
    
    # Create platform-specific baseline directory
    mkdir -p "$BASELINES_DIR/$platform"
    
    # Set environment variables for the test
    export TEST_PASSWORD="${TEST_PASSWORD:-testpassword123!}"
    
    # Run Maestro flows
    for flow_file in $(find "$flow_path" -name "*.yaml" -type f); do
        flow_name=$(basename "$flow_file" .yaml)
        echo "  Running: $flow_name"
        
        # Skip helper flows that are meant to be included by others
        if [[ "$flow_name" == "login-unlock" ]] || [[ "$flow_name" == "backup-flow" ]]; then
            echo "    (Skipping helper flow)"
            continue
        fi
        
        maestro test "$flow_file" \
            --env TEST_PASSWORD="$TEST_PASSWORD" \
            2>&1 | grep -E "(takeScreenshot|assertScreenshot|PASS|FAIL)" || true
        
        echo "    Done"
    done
}

# Check for running simulator/emulator
check_device() {
    local platform=$1
    
    if [ "$platform" == "ios" ]; then
        if ! xcrun simctl list devices booted | grep -q "Booted"; then
            echo -e "${YELLOW}No iOS simulator running. Starting iPhone 15 Pro...${NC}"
            xcrun simctl boot "iPhone 15 Pro" 2>/dev/null || {
                echo -e "${RED}Failed to boot simulator. Please start one manually.${NC}"
                exit 1
            }
        fi
    elif [ "$platform" == "android" ]; then
        if ! adb devices | grep -q "emulator"; then
            echo -e "${YELLOW}No Android emulator running. Please start one manually.${NC}"
            echo "You can start one with: emulator -avd Pixel_5_Pro_API_34"
            exit 1
        fi
    fi
}

# Main execution
if [ "$PLATFORM" == "all" ]; then
    check_device "ios"
    run_baseline_capture "ios" "$FLOW_PATH"
    
    echo ""
    echo -e "${YELLOW}Switch to Android emulator and press Enter to continue...${NC}"
    read -r
    
    check_device "android"
    run_baseline_capture "android" "$FLOW_PATH"
else
    check_device "$PLATFORM"
    run_baseline_capture "$PLATFORM" "$FLOW_PATH"
fi

echo ""
echo -e "${GREEN}=== Baseline Update Complete ===${NC}"
echo ""
echo "Baselines saved to: $BASELINES_DIR"
echo ""
echo "Next steps:"
echo "  1. Review the captured screenshots"
echo "  2. Commit the baselines: git add .maestro/baselines/ && git commit -m 'chore: update visual baselines'"
echo "  3. Push to your branch"
