#!/usr/bin/env bash
set -euo pipefail

#
# Optimize PNG and JPEG images in the app/ directory using pngquant and mozjpeg.
#
# Usage:
#   ./scripts/optimize-images.sh              # optimize all images in app/
#   ./scripts/optimize-images.sh app/images/  # optimize images in a specific directory
#   ./scripts/optimize-images.sh --dry-run    # preview savings without modifying files
#

DRY_RUN=false
TARGET_DIR="app"
QUALITY_PNG="65-85"
QUALITY_JPG="85"
MIN_SAVINGS=4096  # skip files where savings < 4KB (matches Sentry threshold)

usage() {
  cat <<EOF
Optimize PNG and JPEG images using lossy compression.

Usage:
  $0 [options] [directory]

Options:
  --dry-run       Preview savings without modifying files
  --quality-png   pngquant quality range (default: $QUALITY_PNG)
  --quality-jpg   mozjpeg quality 0-100 (default: $QUALITY_JPG)
  -h, --help      Show this help

Examples:
  $0                          # optimize all images under app/
  $0 app/images/              # optimize a specific directory
  $0 --dry-run                # preview without writing
  $0 --quality-png 80-90      # higher quality, less savings
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DRY_RUN=true; shift ;;
    --quality-png)    QUALITY_PNG="$2"; shift 2 ;;
    --quality-jpg)    QUALITY_JPG="$2"; shift 2 ;;
    -h|--help)        usage ;;
    *)                TARGET_DIR="$1"; shift ;;
  esac
done

if ! command -v pngquant &>/dev/null; then
  echo "Installing pngquant..."
  brew install pngquant
fi

if ! command -v cjpeg &>/dev/null; then
  echo "Installing mozjpeg..."
  brew install mozjpeg
  CJPEG="$(brew --prefix mozjpeg)/bin/cjpeg"
else
  CJPEG="cjpeg"
fi

total_saved=0
files_optimized=0
files_skipped=0

human_size() {
  local bytes=$1
  if [[ $bytes -ge 1048576 ]]; then
    printf "%.1fM" "$(echo "scale=1; $bytes / 1048576" | bc)"
  elif [[ $bytes -ge 1024 ]]; then
    printf "%dK" $((bytes / 1024))
  else
    printf "%dB" "$bytes"
  fi
}

optimize_png() {
  local file="$1"
  local original_size
  original_size=$(stat -f%z "$file")

  local tmp
  tmp=$(mktemp)
  trap "rm -f '$tmp'" RETURN

  if ! pngquant --quality="$QUALITY_PNG" --strip --force --output "$tmp" "$file" 2>/dev/null; then
    ((files_skipped++)) || true
    return
  fi

  local new_size
  new_size=$(stat -f%z "$tmp")
  local saved=$((original_size - new_size))

  if [[ $saved -lt $MIN_SAVINGS ]]; then
    ((files_skipped++)) || true
    return
  fi

  local pct=$((saved * 100 / original_size))

  if [[ "$DRY_RUN" == "true" ]]; then
    printf "  [DRY RUN] %s: %s → %s (-%s, %d%%)\n" \
      "$file" "$(human_size "$original_size")" "$(human_size "$new_size")" "$(human_size "$saved")" "$pct"
  else
    cp "$tmp" "$file"
    printf "  ✅ %s: %s → %s (-%s, %d%%)\n" \
      "$file" "$(human_size "$original_size")" "$(human_size "$new_size")" "$(human_size "$saved")" "$pct"
  fi

  total_saved=$((total_saved + saved))
  ((files_optimized++)) || true
}

optimize_jpg() {
  local file="$1"
  local original_size
  original_size=$(stat -f%z "$file")

  local tmp
  tmp=$(mktemp).jpg
  trap "rm -f '$tmp'" RETURN

  if ! "$CJPEG" -quality "$QUALITY_JPG" -outfile "$tmp" "$file" 2>/dev/null; then
    ((files_skipped++)) || true
    return
  fi

  local new_size
  new_size=$(stat -f%z "$tmp")
  local saved=$((original_size - new_size))

  if [[ $saved -lt $MIN_SAVINGS ]]; then
    ((files_skipped++)) || true
    return
  fi

  local pct=$((saved * 100 / original_size))

  if [[ "$DRY_RUN" == "true" ]]; then
    printf "  [DRY RUN] %s: %s → %s (-%s, %d%%)\n" \
      "$file" "$(human_size "$original_size")" "$(human_size "$new_size")" "$(human_size "$saved")" "$pct"
  else
    cp "$tmp" "$file"
    printf "  ✅ %s: %s → %s (-%s, %d%%)\n" \
      "$file" "$(human_size "$original_size")" "$(human_size "$new_size")" "$(human_size "$saved")" "$pct"
  fi

  total_saved=$((total_saved + saved))
  ((files_optimized++)) || true
}

echo "Scanning $TARGET_DIR for images..."
echo ""

echo "── PNG files ──"
while IFS= read -r -d '' file; do
  optimize_png "$file"
done < <(find "$TARGET_DIR" -type f -name "*.png" -print0)

echo ""
echo "── JPEG files ──"
while IFS= read -r -d '' file; do
  optimize_jpg "$file"
done < <(find "$TARGET_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" \) -print0)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Files optimized: $files_optimized"
echo "  Files skipped (savings < 4KB): $files_skipped"
echo "  Total saved: $(human_size $total_saved)"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "  (dry run — no files were modified)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
