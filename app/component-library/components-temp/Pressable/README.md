# Pressable

A design-system `Pressable` that replaces `TouchableOpacity` across the
app. Instead of dimming the entire subtree on press, it layers the
semi-transparent `background.pressed` token on top of the caller's
resting style. The component never owns a resting background — that
stays the parent's responsibility — so the overlay composites correctly
over any surface (`default`, `section`, `error.default`, etc.).

This matches the pressed-state model used elsewhere in the design
system (e.g. `Button` tertiary variant in
`@metamask/design-system-react-native`).

## Exports

- `Pressable` (default) — uses RN core `Pressable`.
- `PressableGH` — uses `Pressable` from `react-native-gesture-handler`.
  Use this when the pressable lives inside a `react-native-gesture-handler`
  scroll/list tree. Mixing the two on Android causes scroll/swipe
  gesture conflicts.

## Props

The default export's props are exactly RN `PressableProps`. `PressableGH`
takes RNGH's `PressableProps`. The only behavioural differences vs. the
underlying primitive are:

- `accessibilityRole` defaults to `'button'` (preserves the implicit
  role `TouchableOpacity` provided).
- On press, the component appends `{ backgroundColor: colors.background.pressed }`
  to the caller's style.

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

- The parent container should own the resting `backgroundColor`, not
  the `Pressable`. The pressed overlay composites against whatever
  surface is behind the Pressable.
- Replacing `TouchableOpacity` with `activeOpacity={1}` → just use
  `Pressable`. A transparent overlay over a transparent surface is a
  visual no-op, so no explicit "no feedback" prop is needed.
- If you previously relied on `TouchableOpacity`'s implicit
  `accessibilityRole="button"`, no action needed — `Pressable` sets it
  by default.
- **Non-button surfaces must override the role.** `accessibilityRole`
  defaults to `"button"`, which is correct for most migrations but
  wrong for surfaces that are not semantic buttons (e.g., list rows
  that open a detail screen → `"link"` or none; backdrops / dismiss
  overlays → none). Pass `accessibilityRole` explicitly so screen
  readers don't announce "button".
