#!/bin/bash
# Fix direct .props access patterns broken by React 19 (RN 0.78+)
#
# React 19 changed how component internals work, so direct .props access
# on elements returned by getByTestId/getAllByTestId no longer works for
# composite/pressable components. Host element props (.value, .style) still work.
#
# Reference: https://github.com/callstack/react-native-testing-library/discussions/1800

set -euo pipefail

FIXED_FILES=()

fix_file() {
  local file="$1"
  local changed=false

  # Check if file has any patterns we care about
  if ! grep -qE '\.props\.(disabled|onPress|onLongPress|onChangeText|onSubmitEditing|onPressIn|onPressOut|onError|onLoad|onLoadEnd|onRefresh|onMessage|onConfirm|onSubmit|onSelectNetwork|onContentSizeChange|onValueChange|secureTextEntry|placeholder|editable|accessibilityState)\b' "$file" 2>/dev/null; then
    return
  fi

  # =======================================================
  # DISABLED PROP PATTERNS
  # =======================================================

  # .props.disabled).toBe(true) → ).toBeDisabled()
  if grep -q '\.props\.disabled)\.toBe(true)' "$file"; then
    sed -i '' 's/\.props\.disabled)\.toBe(true)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  # .props.disabled).toBe(false) → ).toBeEnabled()
  if grep -q '\.props\.disabled)\.toBe(false)' "$file"; then
    sed -i '' 's/\.props\.disabled)\.toBe(false)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # .props.disabled).toBeTruthy() → ).toBeDisabled()
  if grep -q '\.props\.disabled)\.toBeTruthy()' "$file"; then
    sed -i '' 's/\.props\.disabled)\.toBeTruthy()/).toBeDisabled()/g' "$file"
    changed=true
  fi

  # .props.disabled).toBeFalsy() → ).toBeEnabled()
  if grep -q '\.props\.disabled)\.toBeFalsy()' "$file"; then
    sed -i '' 's/\.props\.disabled)\.toBeFalsy()/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # =======================================================
  # ACCESSIBILITY STATE DISABLED PATTERNS
  # =======================================================

  # .props.accessibilityState.disabled).toBe(true) → ).toBeDisabled()
  if grep -q '\.props\.accessibilityState\.disabled)\.toBe(true)' "$file"; then
    sed -i '' 's/\.props\.accessibilityState\.disabled)\.toBe(true)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState.disabled).toBe(false) → ).toBeEnabled()
  if grep -q '\.props\.accessibilityState\.disabled)\.toBe(false)' "$file"; then
    sed -i '' 's/\.props\.accessibilityState\.disabled)\.toBe(false)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState.disabled).toBeTruthy() → ).toBeDisabled()
  if grep -q '\.props\.accessibilityState\.disabled)\.toBeTruthy()' "$file"; then
    sed -i '' 's/\.props\.accessibilityState\.disabled)\.toBeTruthy()/).toBeDisabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState.disabled).toBeFalsy() → ).toBeEnabled()
  if grep -q '\.props\.accessibilityState\.disabled)\.toBeFalsy()' "$file"; then
    sed -i '' 's/\.props\.accessibilityState\.disabled)\.toBeFalsy()/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState?.disabled).toBe(true) → ).toBeDisabled()
  if grep -q '\.props\.accessibilityState?\.disabled)\.toBe(true)' "$file"; then
    sed -i '' 's/\.props\.accessibilityState?\.disabled)\.toBe(true)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState?.disabled).toBe(false) → ).toBeEnabled()
  if grep -q '\.props\.accessibilityState?\.disabled)\.toBe(false)' "$file"; then
    sed -i '' 's/\.props\.accessibilityState?\.disabled)\.toBe(false)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState?.disabled).toBeTruthy() → ).toBeDisabled()
  if grep -q '\.props\.accessibilityState?\.disabled)\.toBeTruthy()' "$file"; then
    sed -i '' 's/\.props\.accessibilityState?\.disabled)\.toBeTruthy()/).toBeDisabled()/g' "$file"
    changed=true
  fi

  # .props.accessibilityState?.disabled).toBeFalsy() → ).toBeEnabled()
  if grep -q '\.props\.accessibilityState?\.disabled)\.toBeFalsy()' "$file"; then
    sed -i '' 's/\.props\.accessibilityState?\.disabled)\.toBeFalsy()/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # =======================================================
  # CALLBACK PATTERNS (no arguments) → fireEvent
  # =======================================================

  # element.props.onPress() → fireEvent.press(element)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onPress\(\)' "$file"; then
    sed -i '' -E 's/([a-zA-Z0-9_\]\)]+)\.props\.onPress\(\)/fireEvent.press(\1)/g' "$file"
    changed=true
  fi

  # element.props.onLongPress() → fireEvent(element, 'longPress')
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onLongPress\(\)' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onLongPress\(\)/fireEvent(\1, 'longPress')/g" "$file"
    changed=true
  fi

  # element.props.onPressIn() → fireEvent(element, 'pressIn')
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onPressIn\(\)' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onPressIn\(\)/fireEvent(\1, 'pressIn')/g" "$file"
    changed=true
  fi

  # element.props.onPressOut() → fireEvent(element, 'pressOut')
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onPressOut\(\)' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onPressOut\(\)/fireEvent(\1, 'pressOut')/g" "$file"
    changed=true
  fi

  # element.props.onSubmitEditing() → fireEvent(element, 'submitEditing')
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onSubmitEditing\(\)' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onSubmitEditing\(\)/fireEvent(\1, 'submitEditing')/g" "$file"
    changed=true
  fi

  # =======================================================
  # CALLBACK PATTERNS (with arguments) → fireEvent
  # =======================================================

  # element.props.onChangeText(args) → fireEvent.changeText(element, args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onChangeText\(' "$file"; then
    sed -i '' -E 's/([a-zA-Z0-9_\]\)]+)\.props\.onChangeText\(([^)]*)\)/fireEvent.changeText(\1, \2)/g' "$file"
    changed=true
  fi

  # element.props.onError(args) → fireEvent(element, 'error', args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onError\(' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onError\(([^)]*)\)/fireEvent(\1, 'error', \2)/g" "$file"
    changed=true
  fi

  # element.props.onLoad(args) → fireEvent(element, 'load', args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onLoad\(' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onLoad\(([^)]*)\)/fireEvent(\1, 'load', \2)/g" "$file"
    changed=true
  fi

  # element.props.onLoadEnd(args) → fireEvent(element, 'loadEnd', args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onLoadEnd\(' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onLoadEnd\(([^)]*)\)/fireEvent(\1, 'loadEnd', \2)/g" "$file"
    changed=true
  fi

  # element.props.onRefresh() → fireEvent(element, 'refresh')
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onRefresh\(\)' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onRefresh\(\)/fireEvent(\1, 'refresh')/g" "$file"
    changed=true
  fi

  # element.props.onMessage(args) → fireEvent(element, 'message', args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onMessage\(' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onMessage\(([^)]*)\)/fireEvent(\1, 'message', \2)/g" "$file"
    changed=true
  fi

  # element.props.onConfirm() → fireEvent(element, 'confirm')
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onConfirm\(\)' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onConfirm\(\)/fireEvent(\1, 'confirm')/g" "$file"
    changed=true
  fi

  # element.props.onContentSizeChange(args) → fireEvent(element, 'contentSizeChange', args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onContentSizeChange\(' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onContentSizeChange\(([^)]*)\)/fireEvent(\1, 'contentSizeChange', \2)/g" "$file"
    changed=true
  fi

  # element.props.onValueChange(args) → fireEvent(element, 'valueChange', args)
  if grep -qE '([a-zA-Z0-9_\]\)]+)\.props\.onValueChange\(' "$file"; then
    sed -i '' -E "s/([a-zA-Z0-9_\]\)]+)\.props\.onValueChange\(([^)]*)\)/fireEvent(\1, 'valueChange', \2)/g" "$file"
    changed=true
  fi

  # =======================================================
  # COMPOSITE COMPONENT PROP PATTERNS (secureTextEntry, placeholder, editable)
  # These only break on composite wrappers like TextField, not on TextInput host.
  # We replace with RNTL queries where possible.
  # =======================================================

  # .props.secureTextEntry).toBe(true) → ).toHaveProp('secureTextEntry', true)
  if grep -q '\.props\.secureTextEntry)\.toBe(true)' "$file"; then
    sed -i '' "s/\.props\.secureTextEntry)\.toBe(true)/).toHaveProp('secureTextEntry', true)/g" "$file"
    changed=true
  fi

  # .props.secureTextEntry).toBe(false) → ).toHaveProp('secureTextEntry', false)
  if grep -q '\.props\.secureTextEntry)\.toBe(false)' "$file"; then
    sed -i '' "s/\.props\.secureTextEntry)\.toBe(false)/).toHaveProp('secureTextEntry', false)/g" "$file"
    changed=true
  fi

  # .props.placeholder).toBe(X) → ).toHaveProp('placeholder', X)
  if grep -qE '\.props\.placeholder\)\.toBe\(' "$file"; then
    sed -i '' -E "s/\.props\.placeholder\)\.toBe\(([^)]+)\)/).toHaveProp('placeholder', \1)/g" "$file"
    changed=true
  fi

  # .props.editable).toBe(true) → ).toHaveProp('editable', true)
  if grep -q '\.props\.editable)\.toBe(true)' "$file"; then
    sed -i '' "s/\.props\.editable)\.toBe(true)/).toHaveProp('editable', true)/g" "$file"
    changed=true
  fi

  # .props.editable).toBe(false) → ).toHaveProp('editable', false)
  if grep -q '\.props\.editable)\.toBe(false)' "$file"; then
    sed -i '' "s/\.props\.editable)\.toBe(false)/).toHaveProp('editable', false)/g" "$file"
    changed=true
  fi

  # =======================================================
  # Ensure fireEvent is imported if we added fireEvent calls
  # =======================================================
  if $changed && grep -qE 'fireEvent\(' "$file"; then
    if ! grep -qE "import.*fireEvent.*from.*@testing-library" "$file" && \
       ! grep -qE "import.*\{[^}]*fireEvent[^}]*\}.*from.*@testing-library" "$file"; then
      if grep -qE "from '@testing-library/react-native'" "$file" || \
         grep -qE 'from "@testing-library/react-native"' "$file"; then
        sed -i '' -E "s/(import \{[^}]*)(} from ['\"]@testing-library\/react-native['\"])/\1, fireEvent \2/" "$file"
        sed -i '' -E 's/\{,/\{/g; s/, ,/, /g' "$file"
      fi
    fi
  fi

  if $changed; then
    FIXED_FILES+=("$file")
    echo "Fixed: $file"
  fi
}

echo "=== Fixing direct .props access patterns in test files ==="
echo "=== Broken by React 19 (RN 0.78+) composite component changes ==="
echo ""

# Find all test files and process them
while IFS= read -r -d '' file; do
  fix_file "$file"
done < <(find app -type f \( -name '*.test.tsx' -o -name '*.test.ts' -o -name '*.test.js' \) -print0)

echo ""
echo "=== Fixed ${#FIXED_FILES[@]} files ==="
echo ""

# Report remaining patterns that need manual attention
echo "=== Remaining patterns needing MANUAL review ==="
echo ""
echo "--- .props.disabled (non-standard patterns) ---"
grep -rnE '\.props\.disabled' app --include='*.test.*' | grep -v 'node_modules' | head -10 || echo "  None found"
echo ""
echo "--- .props.accessibilityState (non-standard patterns) ---"
grep -rnE '\.props\.accessibilityState' app --include='*.test.*' | grep -v 'node_modules' | head -10 || echo "  None found"
echo ""
echo "--- .props.on* callbacks not auto-fixed (onSelectNetwork, onSubmit, custom) ---"
grep -rnE '\.props\.on[A-Z][a-zA-Z]*\(' app --include='*.test.*' | grep -v 'node_modules' | head -30 || echo "  None found"
echo ""
echo "--- .props.secureTextEntry / .props.placeholder / .props.editable (remaining) ---"
grep -rnE '\.props\.(secureTextEntry|placeholder|editable)' app --include='*.test.*' | grep -v 'node_modules' | head -10 || echo "  None found"
