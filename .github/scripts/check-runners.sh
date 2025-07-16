#!/bin/bash
# check-runners.sh
ALLOWED_RUNNERS="ubuntu-latest|macos-latest|ubuntu-24.04|ubuntu-22.04|macos-13|macos-15"

if grep -r "runs-on:" .github/workflows/ | grep -v -E "runs-on: (${ALLOWED_RUNNERS})" | grep -v "#"; then
    echo "❌ Only ubuntu-latest and macos-latest runners are allowed"
    exit 1
else
    echo "✅ All runners are compliant"
fi
