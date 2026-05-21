# Pressable

A design-system `Pressable` that replaces `TouchableOpacity` across the app.
Instead of dimming the entire subtree on press, it swaps the background
color to the matching pressed token for the chosen surface variant. Content
(text, icons) stays fully opaque, which keeps elevated surfaces visible in
pure-black dark mode.

This component exists primarily to support the `TouchableOpacity` →
`Pressable` migration. Callers pick a semantic variant; the component owns
the resting + pressed token pair so the migration becomes consistent
across the codebase.

## Exports

- `Pressable` (default) — uses RN core `Pressable`.
- `PressableGH` — uses `Pressable` from `react-native-gesture-handler`. Use
  this when the pressable lives inside a `react-native-gesture-handler`
  scroll/list tree. Mixing the two on Android causes scroll/swipe gesture
  conflicts.

## Props

Extends RN `PressableProps` (except `style`, which is re-declared so the
function form composes with the variant background).

- **`variant`** (`PressableVariant`, default `'none'`): semantic surface
  variant. Determines resting + pressed background colors.
- **`style`** (`StyleProp<ViewStyle> | (state) => StyleProp<ViewStyle>`):
  merged on top of the variant background. Function form receives
  `{ pressed }`.
- **`accessibilityRole`** (default `'button'`): override if the surface is
  not semantically a button.

## Variant → token mapping

| Variant       | Resting                 | Pressed                     | When to use                                             |
| ------------- | ----------------------- | --------------------------- | ------------------------------------------------------- |
| `section`     | `background.section`    | `background.defaultPressed` | Bottom sheets, action list rows, cards                  |
| `subsection`  | `background.subsection` | `background.defaultPressed` | Nested interactive rows                                 |
| `default`     | `background.default`    | `background.defaultPressed` | Full-page surfaces                                      |
| `muted`       | `background.muted`      | `background.mutedPressed`   | Muted / secondary surfaces                              |
| `transparent` | none                    | `background.defaultPressed` | Invisible at rest, but should still flash on press      |
| `none`        | none                    | none                        | No press feedback (mirrors the old `activeOpacity={1}`) |

## Usage

```tsx
import Pressable from 'app/component-library/components-temp/Pressable';

<Pressable variant="section" onPress={onPress} style={{ padding: 16 }}>
  <Text>Action</Text>
</Pressable>;
```

Inside a `react-native-gesture-handler` scroll/list tree:

```tsx
import { PressableGH } from 'app/component-library/components-temp/Pressable';

<PressableGH variant="section" onPress={onPress}>
  ...
</PressableGH>;
```

## Migration notes

- Replacing `TouchableOpacity` with `activeOpacity={1}` → use `variant="none"`
  (or add a deliberate variant if design wants press feedback added).
- Replacing a `TouchableOpacity` whose background was set via `style`
  → pick the variant matching that background token and remove the
  `backgroundColor` from the inline style. The variant will set it.
- If you previously relied on `TouchableOpacity`'s implicit
  `accessibilityRole="button"`, no action needed — `Pressable` sets it by
  default.
- **Non-button surfaces must override the role.** `accessibilityRole`
  defaults to `"button"`, which is correct for most migrations but wrong
  for surfaces that are not semantic buttons (e.g., list rows that open a
  detail screen → `"link"` or none; backdrop / dismiss overlays → none;
  invisible hit targets that wrap larger content → none). Pass
  `accessibilityRole` explicitly in those cases so screen readers don't
  announce "button".
- **Watch out for `variant="none"` + the default button role.** Many of
  the existing `activeOpacity={1}` call sites are not buttons at all
  (backdrops, dismiss overlays, invisible hit targets). When migrating
  these, remember to override `accessibilityRole` — `variant="none"`
  only suppresses the visual press feedback, it does not change the a11y
  role.
