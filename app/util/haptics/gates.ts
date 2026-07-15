import { Platform } from 'react-native';

export interface HapticGateOptions {
  /** User has toggled "Reduced haptics" ON in app settings (default: false). */
  reducedHaptics: boolean;
  /** Remote kill switch is active — blocks all haptic playback (default: false). */
  killSwitchActive: boolean;
}

/**
 * Determines whether a haptic should fire.
 *
 * Gate order:
 * 1. Platform — web is never allowed (RN-only safety check).
 * 2. In-app preference — the user toggled "reduced haptics."
 * 3. Remote kill switch — instant production disable without a release.
 *
 * Note: OS-level haptics disabled state is handled by expo-haptics itself
 * (the native API is a no-op when the user has disabled system haptics).
 * Android is progressive enhancement — we still attempt playback and catch
 * errors in `play.ts` / `useHaptics.ts` so flows never break.
 */
export function shouldPlayHaptic(options: HapticGateOptions): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  if (options.reducedHaptics) {
    return false;
  }

  if (options.killSwitchActive) {
    return false;
  }

  return true;
}
