import { Platform } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

/**
 * Fire a haptic for a `<Switch>` toggle, respecting iOS UISwitch's built-in
 * native tick.
 *
 * iOS UISwitch already emits a subtle native haptic on every toggle, so by
 * default this util only fires `impactAsync` on Android — layering our own
 * impact on top of the native iOS tick can read as a doubled feel,
 * especially at the `Light` strength. Pass `override: true` for elevated
 * controls (e.g. a master switch that should outrank subordinate toggles)
 * that are intentionally weightier than the native tick on both platforms.
 *
 * Use plain `impactAsync` directly for non-Switch surfaces (buttons,
 * `TouchableOpacity` rows, sliders) — those have no native iOS haptic
 * to coexist with.
 *
 * @param style - The `ImpactFeedbackStyle` to play (e.g. `Light`, `Medium`).
 * @param options.override - When `true`, also fire on iOS. Defaults to `false`.
 */
export const fireSwitchHaptic = (
  style: ImpactFeedbackStyle,
  options: { override?: boolean } = {},
): void => {
  if (Platform.OS === 'ios' && !options.override) {
    return;
  }
  impactAsync(style);
};
