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
 *
 * The nudge can appear even when OS push is already granted (e.g. in-app
 * notifications are off or push is not registered), so we enable directly
 * whenever the OS is already granted OR can still show its permission dialog.
 *
 * `isPromptable` must come from `isPushPermissionPromptable()`, which is
 * platform-aware: iOS only reports NOT_DETERMINED as promptable, while Notifee
 * does not expose that state on Android, so any not-granted Android state is
 * treated as promptable and left to `requestPermission` to resolve. We only
 * deep-link to device settings when the OS is neither granted nor promptable
 * (i.e. it can no longer show its own dialog).
 */
export function resolveCliLoginPushNudgeTurnOnAction({
  isGranted,
  isPromptable,
}: {
  isGranted: boolean;
  isPromptable: boolean;
}): CliLoginPushNudgeTurnOnAction {
  if (isGranted || isPromptable) {
    return 'enable_notifications';
  }
  return 'open_device_settings';
}
