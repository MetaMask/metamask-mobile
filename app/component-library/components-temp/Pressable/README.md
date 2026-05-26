# Pressable

A design-system `Pressable` that replaces `TouchableOpacity` across the
app. Instead of dimming the entire subtree on press, it applies the
semi-transparent `background.pressed` overlay on press. The overlay
composites over any resting background, so callers don't need to pick a
token pair per surface — keep your existing background and the component
handles the pressed state.

This matches the pressed-state model used elsewhere in the design system
(e.g. `Button` tertiary variant in
`@metamask/design-system-react-native`).

## Exports

- `Pressable` (default) — uses RN core `Pressable`.
- `PressableGH` — uses `Pressable` from `react-native-gesture-handler`.
  Use this when the pressable lives inside a `react-native-gesture-handler`
  scroll/list tree. Mixing the two on Android causes scroll/swipe gesture
  conflicts.

## Props

Extends RN `PressableProps` (except `style`, which is re-declared so the
function form composes with the pressed overlay).

- **`disableFeedback`** (`boolean`, default `false`): suppress the
  pressed overlay. Use for surfaces that are pressable but intentionally
  show no press feedback (backdrops, dismiss overlays, invisible hit
  targets — i.e. the old `activeOpacity={1}` cases).
- **`style`** (`StyleProp<ViewStyle> | (state) => StyleProp<ViewStyle>`):
  caller-owned style. The pressed overlay is layered on top, so caller
  `backgroundColor` is the resting color.
- **`accessibilityRole`** (default `'button'`): override if the surface
  is not semantically a button.

## Usage

```tsx
import Pressable from 'app/component-library/components-temp/Pressable';

<Pressable onPress={onPress} style={styles.row}>
  <Text>Action</Text>
</Pressable>;
```

Inside a `react-native-gesture-handler` scroll/list tree:

```tsx
import { PressableGH } from 'app/component-library/components-temp/Pressable';

<PressableGH onPress={onPress} style={styles.row}>
  ...
</PressableGH>;
```

## Migration notes

- Replacing `TouchableOpacity` with `activeOpacity={1}` → pass
  `disableFeedback`. Background is untouched in both states.
- Replacing a `TouchableOpacity` whose background was set via `style` →
  no change needed; keep the `backgroundColor` in the caller style. The
  pressed overlay layers on top.
- If you previously relied on `TouchableOpacity`'s implicit
  `accessibilityRole="button"`, no action needed — `Pressable` sets it
  by default.
- **Non-button surfaces must override the role.** `accessibilityRole`
  defaults to `"button"`, which is correct for most migrations but
  wrong for surfaces that are not semantic buttons (e.g., list rows
  that open a detail screen → `"link"` or none; backdrops / dismiss
  overlays → none). Pass `accessibilityRole` explicitly in those cases
  so screen readers don't announce "button".
