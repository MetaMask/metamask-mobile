import { Platform } from 'react-native';
import type { ImpactFeedbackStyle } from 'expo-haptics';
import { withGatedPlayback } from './gatedExecution';
import { getHapticGateOptions } from './play';
import { vendorImpactRaw } from './vendorPlayback';

/**
 * Fire a haptic for a `<Switch>` toggle, respecting iOS UISwitch's built-in
 * native tick.
 *
 * iOS UISwitch already emits a subtle native haptic on every toggle, so by
 * default this util only fires on Android — layering our own impact on top of
 * the native iOS tick can read as a doubled feel, especially at the `Light`
 * strength. Pass `override: true` for elevated controls (e.g. a master switch
 * that should outrank subordinate toggles) that are intentionally weightier
 * than the native tick on both platforms.
 *
 * Uses the same gates as `playImpact` / `playSelection` (in-app reduced haptics
 * and the remote kill switch) before calling the vendor API.
 *
 * @param style - The `ImpactFeedbackStyle` to play (e.g. `Light`, `Medium`).
 * @param options.override - When `true`, also fire on iOS. Defaults to `false`.
 */
export function fireSwitchHaptic(
  style: ImpactFeedbackStyle,
  options: { override?: boolean } = {},
): void {
  if (Platform.OS === 'ios' && !options.override) {
    return;
  }
  void withGatedPlayback(getHapticGateOptions(), () => vendorImpactRaw(style));
}
