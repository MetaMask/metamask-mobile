import { isPushPermissionGranted } from '../services/NotificationService';

export interface PushNotificationStatus {
  controllerIsPushEnabled: boolean;
  effectivePushEnabled: boolean;
  nativeOsPermissionEnabled: boolean | null;
}

interface ResolvePushNotificationStatusOptions {
  controllerIsPushEnabled: boolean;
}

export const resolveNativePushPermissionEnabled = async (): Promise<boolean> =>
  await isPushPermissionGranted().catch(() => false);

export const resolvePushNotificationStatus = async ({
  controllerIsPushEnabled,
}: ResolvePushNotificationStatusOptions): Promise<PushNotificationStatus> => {
  const nativeOsPermissionEnabled = await resolveNativePushPermissionEnabled();

  return {
    controllerIsPushEnabled,
    effectivePushEnabled: controllerIsPushEnabled && nativeOsPermissionEnabled,
    nativeOsPermissionEnabled,
  };
};
