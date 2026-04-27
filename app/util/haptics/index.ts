export { fireSwitchHaptic } from './switchHaptic';
export {
  playSuccessNotification,
  playErrorNotification,
  playWarningNotification,
  playNotification,
  playImpact,
  playSelection,
} from './play';
export { useHaptics } from './useHaptics';
export { NotificationMoment, ImpactMoment } from './catalog';
/** Re-export for dev tooling — call sites must not import `expo-haptics` directly (eslint). */
export { ImpactFeedbackStyle } from 'expo-haptics';
export type {
  HapticMoment,
  HapticImpactMoment,
  HapticNotificationMoment,
  HapticsPlayer,
} from './catalog';
