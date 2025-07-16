#!/bin/bash
# check-runners.sh

ALLOWED_RUNNERS="ubuntu-latest|macos-latest|ubuntu-24.04|ubuntu-22.04|macos-13|macos-15"

echo "Checking for non-compliant runners..."

NON_COMPLIANT=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | \
  xargs grep -H "runs-on:" | \
  grep -v -E "(${ALLOWED_RUNNERS})")

if [ -n "$NON_COMPLIANT" ]; then
    echo "❌ Found non-compliant runners:"
    echo "$NON_COMPLIANT"
    echo ""
    echo "Only these runners are allowed: ubuntu-latest, macos-latest, ubuntu-24.04, ubuntu-22.04, macos-13, macos-15"
    exit 1
else
    echo "✅ All runners are compliant"
fi
