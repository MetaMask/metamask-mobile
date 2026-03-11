#!/bin/bash
#
# Generate Visual Diff Images
# Compares baseline screenshots with after-nav screenshots using ImageMagick
#
# Usage:
#   ./generate-diffs.sh [options]
#
# Options:
#   --highlight-color COLOR   Color for changed pixels (default: red)
#   --threshold PERCENT       Fuzz threshold for comparison (default: 5%)
#   --output-format FORMAT    Output format: diff|side-by-side|both (default: both)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(dirname "$SCRIPT_DIR")"

BASELINES_DIR="$MAESTRO_DIR/baselines"
AFTER_NAV_DIR="$MAESTRO_DIR/after-nav"
DIFFS_DIR="$MAESTRO_DIR/diffs"

HIGHLIGHT_COLOR="red"
LOWLIGHT_COLOR="white"
THRESHOLD="5%"
OUTPUT_FORMAT="both"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --highlight-color)
            HIGHLIGHT_COLOR="$2"
            shift 2
            ;;
        --threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        --output-format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

compare_images() {
    local baseline="$1"
    local after="$2"
    local diff_dir="$3"
    local name="$4"
    
    local diff_image="$diff_dir/${name}-diff.png"
    local side_by_side="$diff_dir/${name}-comparison.png"
    local report_file="$diff_dir/${name}-report.txt"
    
    # Calculate difference metrics
    local diff_output
    diff_output=$(compare -metric AE -fuzz "$THRESHOLD" "$baseline" "$after" null: 2>&1) || true
    local diff_pixels="${diff_output##*: }"
    diff_pixels="${diff_pixels%%[^0-9]*}"
    
    # Get image dimensions
    local dimensions
    dimensions=$(identify -format "%wx%h" "$baseline" 2>/dev/null || echo "unknown")
    
    # Calculate percentage
    local total_pixels=1
    if [[ "$dimensions" != "unknown" ]]; then
        local width="${dimensions%x*}"
        local height="${dimensions#*x}"
        total_pixels=$((width * height))
    fi
    
    local diff_percentage=0
    if [[ "$diff_pixels" =~ ^[0-9]+$ ]] && [ "$total_pixels" -gt 0 ]; then
        diff_percentage=$(echo "scale=4; ($diff_pixels / $total_pixels) * 100" | bc)
    fi
    
    # Generate diff image if there are differences
    if [[ "$diff_pixels" =~ ^[0-9]+$ ]] && [ "$diff_pixels" -gt 0 ]; then
        log_warning "CHANGED: $name ($diff_pixels pixels, ${diff_percentage}%)"
        
        if [[ "$OUTPUT_FORMAT" == "diff" ]] || [[ "$OUTPUT_FORMAT" == "both" ]]; then
            compare -fuzz "$THRESHOLD" \
                -highlight-color "$HIGHLIGHT_COLOR" \
                -lowlight-color "$LOWLIGHT_COLOR" \
                -compose src \
                "$baseline" "$after" "$diff_image" 2>/dev/null || true
        fi
        
        if [[ "$OUTPUT_FORMAT" == "side-by-side" ]] || [[ "$OUTPUT_FORMAT" == "both" ]]; then
            # Create side-by-side comparison with labels
            convert \
                \( "$baseline" -resize 400x -gravity center -extent 400x800 \
                   -font Helvetica -pointsize 20 -fill black \
                   -gravity north -annotate +0+10 "BASELINE" \) \
                \( "$after" -resize 400x -gravity center -extent 400x800 \
                   -font Helvetica -pointsize 20 -fill black \
                   -gravity north -annotate +0+10 "AFTER NAV" \) \
                \( "$diff_image" -resize 400x -gravity center -extent 400x800 \
                   -font Helvetica -pointsize 20 -fill black \
                   -gravity north -annotate +0+10 "DIFF" \) \
                +append "$side_by_side" 2>/dev/null || \
            convert "$baseline" "$after" +append "$side_by_side" 2>/dev/null || true
        fi
        
        # Write report
        cat > "$report_file" << EOF
Visual Regression Report: $name
================================
Baseline: $baseline
After Nav: $after
Dimensions: $dimensions
Changed Pixels: $diff_pixels
Change Percentage: ${diff_percentage}%
Threshold Used: $THRESHOLD
EOF
        
        return 1  # Indicates differences found
    else
        log_success "UNCHANGED: $name"
        return 0  # No differences
    fi
}

main() {
    log_info "Starting diff generation..."
    log_info "Baseline dir: $BASELINES_DIR"
    log_info "After-nav dir: $AFTER_NAV_DIR"
    log_info "Output dir: $DIFFS_DIR"
    log_info "Threshold: $THRESHOLD"
    echo ""
    
    # Check if after-nav directory exists
    if [ ! -d "$AFTER_NAV_DIR" ]; then
        log_error "after-nav directory not found. Run capture first."
        exit 1
    fi
    
    # Create diffs directory
    mkdir -p "$DIFFS_DIR"
    
    local total=0
    local changed=0
    local missing=0
    local unchanged=0
    
    # Find all baseline images
    while IFS= read -r -d '' baseline; do
        ((total++))
        
        # Get relative path
        local rel_path="${baseline#$BASELINES_DIR/}"
        local after="$AFTER_NAV_DIR/$rel_path"
        local diff_subdir="$DIFFS_DIR/$(dirname "$rel_path")"
        local name=$(basename "$baseline" .png)
        
        mkdir -p "$diff_subdir"
        
        if [ -f "$after" ]; then
            if ! compare_images "$baseline" "$after" "$diff_subdir" "$name"; then
                ((changed++))
            else
                ((unchanged++))
            fi
        else
            log_warning "MISSING: $rel_path (no after-nav screenshot)"
            ((missing++))
        fi
    done < <(find "$BASELINES_DIR" -name "*.png" -print0)
    
    echo ""
    log_info "=== Diff Generation Summary ==="
    echo "Total baselines:     $total"
    echo "Unchanged:           $unchanged"
    echo "Changed:             $changed"
    echo "Missing after-nav:   $missing"
    echo ""
    
    if [ "$changed" -gt 0 ]; then
        log_warning "Visual regression detected! Review diffs at: $DIFFS_DIR"
        
        # Generate summary report
        cat > "$DIFFS_DIR/summary.md" << EOF
# Visual Regression Summary

**Date:** $(date)
**Threshold:** $THRESHOLD

## Results

| Metric | Count |
|--------|-------|
| Total Baselines | $total |
| Unchanged | $unchanged |
| Changed | $changed |
| Missing | $missing |

## Changed Screens

EOF
        
        find "$DIFFS_DIR" -name "*-report.txt" -exec cat {} \; >> "$DIFFS_DIR/summary.md"
        
        log_info "Summary written to: $DIFFS_DIR/summary.md"
    else
        log_success "No visual regressions detected!"
    fi
}

main
