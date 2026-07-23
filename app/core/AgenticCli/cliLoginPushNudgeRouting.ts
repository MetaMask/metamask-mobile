import type { PushPermissionStatus } from '../../util/notifications/services/NotificationService';

export type CliLoginPushNudgeTurnOnAction =
  | 'enable_notifications'
  | 'open_device_settings';

/**
 * Whether the post-CLI-login push nudge should appear. Requires both MetaMask
 * in-app notifications (Settings → Notifications) and native OS push permission.
 */
export function shouldShowCliLoginPushNudge({
  isMetamaskNotificationsEnabled,
  isMetaMaskPushNotificationsEnabled,
  nativePushStatus,
}: {
  isMetamaskNotificationsEnabled: boolean;
  isMetaMaskPushNotificationsEnabled: boolean;
  nativePushStatus: PushPermissionStatus;
}): boolean {
  if (!isMetamaskNotificationsEnabled) {
    return true;
  }
  if (nativePushStatus !== 'granted') {
    return true;
  }
  if (!isMetaMaskPushNotificationsEnabled) {
    return true;
  }
  return false;
}

/**
 * Chooses the next step when the user taps "Turn on" on the CLI push nudge toast.
 * MM in-app notifications are enabled programmatically via enableNotifications().
 */
export function resolveCliLoginPushNudgeTurnOnAction({
  nativePushStatus,
}: {
  nativePushStatus: PushPermissionStatus;
}): CliLoginPushNudgeTurnOnAction {
  if (nativePushStatus === 'denied') {
    return 'open_device_settings';
  }
  return 'enable_notifications';
}
