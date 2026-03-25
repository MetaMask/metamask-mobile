#!/bin/bash
#
# Visual Regression Comparison Script
# Compares baseline screenshots with screenshots after navigation changes
#
# Usage:
#   ./compare-visual-regression.sh [command]
#
# Commands:
#   sync      - Merge latest navigation changes and regenerate screenshots
#   capture   - Only capture new screenshots (skip merge)
#   diff      - Only generate diff images (skip capture)
#   full      - Run full workflow: sync + capture + diff (default)
#   help      - Show this help message

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$MAESTRO_DIR")"

BASELINES_DIR="$MAESTRO_DIR/baselines"
AFTER_NAV_DIR="$MAESTRO_DIR/after-nav"
DIFFS_DIR="$MAESTRO_DIR/diffs"

NAV_BRANCH="feat/react-navigation-v6-migration"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Visual Regression Comparison Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  sync      Merge latest navigation changes and regenerate screenshots"
    echo "  capture   Only capture new screenshots to after-nav/ (skip merge)"
    echo "  diff      Only generate diff images (skip capture)"
    echo "  full      Run full workflow: sync + capture + diff (default)"
    echo "  help      Show this help message"
    echo ""
    echo "Prerequisites:"
    echo "  - ImageMagick installed (brew install imagemagick)"
    echo "  - Maestro CLI installed"
    echo "  - iOS Simulator running with app built"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v maestro &> /dev/null; then
        log_error "Maestro CLI not found. Install with: curl -Ls 'https://get.maestro.mobile.dev' | bash"
        exit 1
    fi
    
    if ! command -v compare &> /dev/null; then
        log_error "ImageMagick not found. Install with: brew install imagemagick"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

sync_navigation_changes() {
    log_info "Syncing navigation changes from $NAV_BRANCH..."
    
    cd "$PROJECT_ROOT"
    
    git fetch origin
    
    if git merge "origin/$NAV_BRANCH" --no-edit; then
        log_success "Navigation changes merged successfully"
    else
        log_error "Merge failed. Please resolve conflicts manually."
        exit 1
    fi
}

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$AFTER_NAV_DIR/ios"
    mkdir -p "$DIFFS_DIR/ios"
    
    # Mirror the baselines directory structure
    for dir in $(find "$BASELINES_DIR/ios" -type d); do
        rel_dir="${dir#$BASELINES_DIR/ios}"
        mkdir -p "$AFTER_NAV_DIR/ios$rel_dir"
        mkdir -p "$DIFFS_DIR/ios$rel_dir"
    done
    
    log_success "Directories set up"
}

capture_screenshots() {
    log_info "Capturing screenshots with navigation changes..."
    log_info "This will run Maestro tests and save to after-nav/"
    
    cd "$PROJECT_ROOT"
    
    # Create a temporary copy of flows that outputs to after-nav
    local temp_flows="$MAESTRO_DIR/flows-temp"
    rm -rf "$temp_flows"
    cp -r "$MAESTRO_DIR/flows" "$temp_flows"
    
    # Update screenshot paths in temp flows
    find "$temp_flows" -name "*.yaml" -type f -exec sed -i '' \
        's|\.maestro/baselines/|.maestro/after-nav/|g' {} \;
    
    # Run each flow category
    local flows=(
        "onboarding/create-wallet.yaml"
        "wallet/wallet-home.yaml"
        "settings/settings-main.yaml"
    )
    
    for flow in "${flows[@]}"; do
        local flow_path="$temp_flows/$flow"
        if [ -f "$flow_path" ]; then
            log_info "Running: $flow"
            maestro test "$flow_path" || log_warning "Flow $flow had issues"
        fi
    done
    
    # Cleanup temp flows
    rm -rf "$temp_flows"
    
    log_success "Screenshot capture complete"
}

generate_diffs() {
    log_info "Generating diff images..."
    
    "$SCRIPT_DIR/generate-diffs.sh"
    
    log_success "Diff generation complete"
}

show_summary() {
    log_info "=== Summary ==="
    
    local total_baselines=$(find "$BASELINES_DIR" -name "*.png" | wc -l | tr -d ' ')
    local total_after=$(find "$AFTER_NAV_DIR" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    local total_diffs=$(find "$DIFFS_DIR" -name "*-diff.png" 2>/dev/null | wc -l | tr -d ' ')
    
    echo ""
    echo "Baseline screenshots:  $total_baselines"
    echo "After-nav screenshots: $total_after"
    echo "Diff images generated: $total_diffs"
    echo ""
    echo "View diffs at: $DIFFS_DIR"
    echo ""
    
    if [ "$total_diffs" -gt 0 ]; then
        log_info "Changed screens:"
        find "$DIFFS_DIR" -name "*-diff.png" -exec basename {} \; | sed 's/-diff\.png$//' | sort
    fi
}

# Main execution
case "${1:-full}" in
    sync)
        check_prerequisites
        sync_navigation_changes
        setup_directories
        capture_screenshots
        generate_diffs
        show_summary
        ;;
    capture)
        check_prerequisites
        setup_directories
        capture_screenshots
        show_summary
        ;;
    diff)
        check_prerequisites
        generate_diffs
        show_summary
        ;;
    full)
        check_prerequisites
        setup_directories
        capture_screenshots
        generate_diffs
        show_summary
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
