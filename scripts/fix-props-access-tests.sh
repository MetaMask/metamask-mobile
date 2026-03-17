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

# EL matches any expression before .props, including:
#   variable         → button.props.onPress()
#   array[0]         → cells[0].props.onPress()
#   fn()             → getByText('x').props.onPress()
#   chained.access   → screen.getByText('x').props.onPress()
# We use a perl-style approach: match everything up to .props. greedily
# For sed, we capture "everything that isn't whitespace or semicolon" before .props
EL='([^ ;,]+)'

fix_file() {
  local file="$1"
  local changed=false

  # Check if file has any patterns we care about
  if ! grep -qE '\.props\.' "$file" 2>/dev/null; then
    return
  fi

  # =======================================================
  # DISABLED PROP PATTERNS
  # Handle both .props. and ?.props. (optional chaining)
  # =======================================================

  if grep -qE '\??\.props\.disabled\)\.toBe\(true\)' "$file"; then
    sed -i '' -E 's/\??\.props\.disabled\)\.toBe\(true\)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.disabled\)\.toBe\(false\)' "$file"; then
    sed -i '' -E 's/\??\.props\.disabled\)\.toBe\(false\)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.disabled\)\.toBeTruthy\(\)' "$file"; then
    sed -i '' -E 's/\??\.props\.disabled\)\.toBeTruthy\(\)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.disabled\)\.toBeFalsy\(\)' "$file"; then
    sed -i '' -E 's/\??\.props\.disabled\)\.toBeFalsy\(\)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # =======================================================
  # ACCESSIBILITY STATE DISABLED PATTERNS
  # =======================================================

  # Handle .props.accessibilityState.disabled and .props.accessibilityState?.disabled
  # Also handle ?.props. optional chaining before props
  if grep -qE '\??\.props\.accessibilityState\??\.disabled\)\.toBe\(true\)' "$file"; then
    sed -i '' -E 's/\??\.props\.accessibilityState\??\.disabled\)\.toBe\(true\)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.accessibilityState\??\.disabled\)\.toBe\(false\)' "$file"; then
    sed -i '' -E 's/\??\.props\.accessibilityState\??\.disabled\)\.toBe\(false\)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.accessibilityState\??\.disabled\)\.toBeTruthy\(\)' "$file"; then
    sed -i '' -E 's/\??\.props\.accessibilityState\??\.disabled\)\.toBeTruthy\(\)/).toBeDisabled()/g' "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.accessibilityState\??\.disabled\)\.toBeFalsy\(\)' "$file"; then
    sed -i '' -E 's/\??\.props\.accessibilityState\??\.disabled\)\.toBeFalsy\(\)/).toBeEnabled()/g' "$file"
    changed=true
  fi

  # =======================================================
  # CALLBACK PATTERNS → fireEvent
  # Use perl for proper greedy matching of complex expressions
  # =======================================================

  # All callback patterns use perl with (\S+?) to match the element expression
  # before .props or ?.props, including array[0], getByText('x'), etc.
  # The (?:\?)?\.props\. handles both .props. and ?.props.

  # .props.onPress() → fireEvent.press(...)
  if grep -qE '\??\.props\.onPress\(\)' "$file"; then
    perl -i -pe 's/(\S+?)\??\.props\.onPress\(\)/fireEvent.press($1)/g' "$file"
    changed=true
  fi

  # .props.onPress(event) → fireEvent.press(..., event)
  if grep -qE '\??\.props\.onPress\([^)]+\)' "$file"; then
    perl -i -pe 's/(\S+?)\??\.props\.onPress\(([^)]+)\)/fireEvent.press($1, $2)/g' "$file"
    changed=true
  fi

  # .props.onLongPress() → fireEvent(el, 'longPress')
  if grep -qE '\??\.props\.onLongPress\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onLongPress\(\)/fireEvent(\$1, 'longPress')/g" "$file"
    changed=true
  fi

  # .props.onPressIn() → fireEvent(el, 'pressIn')
  if grep -qE '\??\.props\.onPressIn\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onPressIn\(\)/fireEvent(\$1, 'pressIn')/g" "$file"
    changed=true
  fi

  # .props.onPressOut() → fireEvent(el, 'pressOut')
  if grep -qE '\??\.props\.onPressOut\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onPressOut\(\)/fireEvent(\$1, 'pressOut')/g" "$file"
    changed=true
  fi

  # .props.onSubmitEditing() → fireEvent(el, 'submitEditing')
  if grep -qE '\??\.props\.onSubmitEditing\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onSubmitEditing\(\)/fireEvent(\$1, 'submitEditing')/g" "$file"
    changed=true
  fi

  # .props.onChangeText(args) → fireEvent.changeText(el, args)
  if grep -qE '\??\.props\.onChangeText\(' "$file"; then
    perl -i -pe 's/(\S+?)\??\.props\.onChangeText\(([^)]*)\)/fireEvent.changeText($1, $2)/g' "$file"
    changed=true
  fi

  # .props.onError(args) → fireEvent(el, 'error', args)
  if grep -qE '\??\.props\.onError\(' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onError\(([^)]*)\)/fireEvent(\$1, 'error', \$2)/g" "$file"
    changed=true
  fi

  # .props.onLoad(args) → fireEvent(el, 'load', args)
  if grep -qE '\??\.props\.onLoad\(' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onLoad\(([^)]*)\)/fireEvent(\$1, 'load', \$2)/g" "$file"
    changed=true
  fi

  # .props.onLoadEnd(args) → fireEvent(el, 'loadEnd', args)
  if grep -qE '\??\.props\.onLoadEnd\(' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onLoadEnd\(([^)]*)\)/fireEvent(\$1, 'loadEnd', \$2)/g" "$file"
    changed=true
  fi

  # .props.onRefresh() → fireEvent(el, 'refresh')
  if grep -qE '\??\.props\.onRefresh\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onRefresh\(\)/fireEvent(\$1, 'refresh')/g" "$file"
    changed=true
  fi

  # .props.onEndReached() → fireEvent(el, 'endReached')
  if grep -qE '\??\.props\.onEndReached\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onEndReached\(\)/fireEvent(\$1, 'endReached')/g" "$file"
    changed=true
  fi

  # .props.onMessage(args) → fireEvent(el, 'message', args)
  if grep -qE '\??\.props\.onMessage\(' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onMessage\(([^)]*)\)/fireEvent(\$1, 'message', \$2)/g" "$file"
    changed=true
  fi

  # .props.onConfirm() → fireEvent(el, 'confirm')
  if grep -qE '\??\.props\.onConfirm\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onConfirm\(\)/fireEvent(\$1, 'confirm')/g" "$file"
    changed=true
  fi

  # .props.onRequestClose() → fireEvent(el, 'requestClose')
  if grep -qE '\??\.props\.onRequestClose\(\)' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onRequestClose\(\)/fireEvent(\$1, 'requestClose')/g" "$file"
    changed=true
  fi

  # .props.onContentSizeChange(args) → fireEvent(el, 'contentSizeChange', args)
  if grep -qE '\??\.props\.onContentSizeChange\(' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onContentSizeChange\(([^)]*)\)/fireEvent(\$1, 'contentSizeChange', \$2)/g" "$file"
    changed=true
  fi

  # .props.onValueChange(args) → fireEvent(el, 'valueChange', args)
  if grep -qE '\??\.props\.onValueChange\(' "$file"; then
    perl -i -pe "s/(\S+?)\??\.props\.onValueChange\(([^)]*)\)/fireEvent(\$1, 'valueChange', \$2)/g" "$file"
    changed=true
  fi

  # =======================================================
  # COMPOSITE COMPONENT PROP PATTERNS
  # =======================================================

  if grep -qE '\??\.props\.secureTextEntry\)\.toBe\(true\)' "$file"; then
    sed -i '' -E "s/\??\.props\.secureTextEntry\)\.toBe\(true\)/).toHaveProp('secureTextEntry', true)/g" "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.secureTextEntry\)\.toBe\(false\)' "$file"; then
    sed -i '' -E "s/\??\.props\.secureTextEntry\)\.toBe\(false\)/).toHaveProp('secureTextEntry', false)/g" "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.placeholder\)\.toBe\(' "$file"; then
    sed -i '' -E "s/\??\.props\.placeholder\)\.toBe\(([^)]+)\)/).toHaveProp('placeholder', \1)/g" "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.editable\)\.toBe\(true\)' "$file"; then
    sed -i '' -E "s/\??\.props\.editable\)\.toBe\(true\)/).toHaveProp('editable', true)/g" "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.editable\)\.toBe\(false\)' "$file"; then
    sed -i '' -E "s/\??\.props\.editable\)\.toBe\(false\)/).toHaveProp('editable', false)/g" "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.editable\)\.toBeTruthy\(\)' "$file"; then
    sed -i '' -E "s/\??\.props\.editable\)\.toBeTruthy\(\)/).toHaveProp('editable', true)/g" "$file"
    changed=true
  fi

  if grep -qE '\??\.props\.editable\)\.toBeFalsy\(\)' "$file"; then
    sed -i '' -E "s/\??\.props\.editable\)\.toBeFalsy\(\)/).toHaveProp('editable', false)/g" "$file"
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
done < <(find app -type f \( -name '*.test.tsx' -o -name '*.test.ts' -o -name '*.test.js' -o -name '*.test.jsx' \) -print0)

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
echo "--- .props.on* callbacks not auto-fixed ---"
grep -rnE '\.props\.on[A-Z][a-zA-Z]*\(' app --include='*.test.*' | grep -v 'node_modules' | head -30 || echo "  None found"
echo ""
echo "--- .props.secureTextEntry / .props.placeholder / .props.editable (remaining) ---"
grep -rnE '\.props\.(secureTextEntry|placeholder|editable)' app --include='*.test.*' | grep -v 'node_modules' | head -10 || echo "  None found"
