import FCMService from '../services/FCMService';

export interface PushNotificationStatus {
  controllerIsPushEnabled: boolean;
  effectivePushEnabled: boolean;
  nativeOsPermissionEnabled: boolean;
}

interface ResolvePushNotificationStatusOptions {
  controllerIsPushEnabled: boolean;
}

export const resolvePushNotificationStatus = async ({
  controllerIsPushEnabled,
}: ResolvePushNotificationStatusOptions): Promise<PushNotificationStatus> => {
  if (!controllerIsPushEnabled) {
    return {
      controllerIsPushEnabled,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    };
  }

  const nativeOsPermissionEnabled =
    await FCMService.isPushNotificationsEnabled()
      .then(Boolean)
      .catch(() => false);

  return {
    controllerIsPushEnabled,
    effectivePushEnabled: nativeOsPermissionEnabled,
    nativeOsPermissionEnabled,
  };
};
