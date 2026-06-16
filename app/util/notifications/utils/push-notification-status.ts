import {
  isPushPermissionGranted,
  isPushPermissionPromptable,
} from '../services/NotificationService';

export interface PushNotificationStatus {
  controllerIsPushEnabled: boolean;
  effectivePushEnabled: boolean;
  nativeOsPermissionEnabled: boolean | null;
}

export interface NativePushPermissionStatus {
  nativeOsPermissionEnabled: boolean;
  nativeOsPermissionPromptable: boolean;
}

interface ResolvePushNotificationStatusOptions {
  controllerIsPushEnabled: boolean;
}

export const resolveNativePushPermissionStatus =
  async (): Promise<NativePushPermissionStatus> => {
    const nativeOsPermissionEnabled = await isPushPermissionGranted().catch(
      () => false,
    );

    if (nativeOsPermissionEnabled) {
      return {
        nativeOsPermissionEnabled,
        nativeOsPermissionPromptable: false,
      };
    }

    const nativeOsPermissionPromptable =
      await isPushPermissionPromptable().catch(() => false);

    return {
      nativeOsPermissionEnabled,
      nativeOsPermissionPromptable,
    };
  };

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
