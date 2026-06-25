# Pressable

A design-system `Pressable` that replaces `TouchableOpacity` across the
app. The component supports two visual feedback modes via the `variant`
prop, so the same primitive covers both the broad case (subtree dim) and
the list-row case (backdrop highlight) without per-call-site guesswork.

## Exports

- `Pressable` (default) — uses RN core `Pressable`.
- `PressableGH` — uses `Pressable` from `react-native-gesture-handler`.
  Use this when the pressable lives inside a `react-native-gesture-handler`
  scroll/list tree. Mixing the two on Android causes scroll/swipe
  gesture conflicts.

## Props

The default export's props are RN `PressableProps` plus a `variant`
field. `PressableGH` takes RNGH's `PressableProps` plus the same
`variant`. Behavioural differences vs. the underlying primitive:

- `accessibilityRole` defaults to `'button'` (preserves the implicit
  role `TouchableOpacity` provided).
- `variant` (defaults to `'default'`) controls press feedback.

### `variant`

Use the `PressableVariant` enum-like const (matches the MMDS pattern used by
`TextVariant`, `ButtonVariants`, etc.) — don't pass raw string literals.

| Value                        | Behaviour                                                                          | When to use                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `PressableVariant.Default`   | Lowers caller subtree opacity to `0.7` on press.                                   | The general case: buttons, icon affordances, inline tappable elements, anywhere `TouchableOpacity` was previously used. |
| `PressableVariant.Highlight` | Composites `colors.background.pressed` over the caller's resting surface on press. | List rows, settings rows, sheet rows — surfaces where a backdrop highlight is the established design pattern.           |
| `PressableVariant.None`      | Applies no visual feedback.                                                        | Only when the caller renders its own press-state styling internally (e.g. `useState(pressed)` toggling its own bg).     |

The `Default` variant mirrors the familiar `TouchableOpacity` model and
is the safe choice when migrating any existing call site. The
`Highlight` variant is an opt-in for list-context surfaces, and is the
recommended choice anywhere the DS list-item treatment applies.

## Usage

```tsx
import Pressable, {
  PressableVariant,
} from 'app/component-library/components-temp/Pressable';

// Default: opacity dim — no need to pass `variant` explicitly
<Pressable onPress={onPress} style={styles.row}>
  <Text>Action</Text>
</Pressable>;

// List-row highlight
<Pressable
  variant={PressableVariant.Highlight}
  onPress={onPress}
  style={styles.row}
>
  <Text>Item</Text>
</Pressable>;
```

Inside a `react-native-gesture-handler` scroll/list tree:

```tsx
import {
  PressableGH,
  PressableVariant,
} from 'app/component-library/components-temp/Pressable';

<PressableGH
  variant={PressableVariant.Highlight}
  onPress={onPress}
  style={styles.row}
>
  ...
</PressableGH>;
```

## Migration notes

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
- When using `variant="highlight"`, the parent container should own the
  resting `backgroundColor`, not the `Pressable`. The pressed overlay
  composites against whatever surface is behind the Pressable.
