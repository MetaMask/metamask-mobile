/**
 * Replaces `react-native-nitro-haptics` JS entry with Expo Haptics.
 * The Nitro hybrid fails in this app (NitroModules / native skew); design system
 * only needs impact / notification / selection.
 */
import {
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactFeedbackStyle as ExpoImpact,
  NotificationFeedbackType as ExpoNotification,
} from 'expo-haptics';

export type ImpactFeedbackStyle =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid';

export type NotificationFeedbackType = 'success' | 'warning' | 'error';

const IMPACT: Record<ImpactFeedbackStyle, ExpoImpact> = {
  light: ExpoImpact.Light,
  medium: ExpoImpact.Medium,
  heavy: ExpoImpact.Heavy,
  soft: ExpoImpact.Soft,
  rigid: ExpoImpact.Rigid,
};

const NOTIF: Record<NotificationFeedbackType, ExpoNotification> = {
  success: ExpoNotification.Success,
  warning: ExpoNotification.Warning,
  error: ExpoNotification.Error,
};

export const Haptics = {
  impact(style: ImpactFeedbackStyle): void {
    impactAsync(IMPACT[style] ?? ExpoImpact.Medium);
  },

  notification(type: NotificationFeedbackType): void {
    notificationAsync(NOTIF[type]);
  },

  selection(): void {
    selectionAsync();
  },

  performAndroidHaptics(_type: string): void {
    impactAsync(ExpoImpact.Light);
  },
};
