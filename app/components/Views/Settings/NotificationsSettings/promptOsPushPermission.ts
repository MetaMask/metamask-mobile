import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';

/**
 * Prompts for OS push permission when needed.
 *
 * @returns Whether the OS currently grants push permission.
 */
export async function promptOsPushPermissionIfNeeded(): Promise<boolean> {
  if (await isPushPermissionGranted()) {
    return true;
  }

  if (await isPushPermissionPromptable()) {
    await requestPushPermissions();
  } else {
    await NotificationService.requestPushNotificationsPermission();
  }

  return isPushPermissionGranted();
}
