#!/bin/bash
# Replaces .props.disabled assertions with RNTL matchers (toBeDisabled/toBeEnabled)
# after Expo upgrade broke direct prop access on pressable elements.
#
# Patterns replaced:
#   expect(x.props.disabled).toBe(true)      → expect(x).toBeDisabled()
#   expect(x.props.disabled).toBe(false)     → expect(x).toBeEnabled()
#   expect(x.props.disabled).toBeTruthy()    → expect(x).toBeDisabled()
#   expect(x.props.disabled).toBeFalsy()     → expect(x).toBeEnabled()

set -euo pipefail

# Find all test files
find app -name '*.test.tsx' -o -name '*.test.ts' -o -name '*.test.js' | while read -r file; do
  if grep -q '\.props\.disabled)' "$file" 2>/dev/null; then
    sed -i '' \
      -e 's/\.props\.disabled)\.toBe(true)/).toBeDisabled()/g' \
      -e 's/\.props\.disabled)\.toBe(false)/).toBeEnabled()/g' \
      -e 's/\.props\.disabled)\.toBeTruthy()/).toBeDisabled()/g' \
      -e 's/\.props\.disabled)\.toBeFalsy()/).toBeEnabled()/g' \
      "$file"
    echo "Fixed: $file"
  fi
done

echo ""
echo "Done. Verify no remaining instances:"
grep -r '\.props\.disabled)' app --include='*.test.*' -l || echo "All clean!"
