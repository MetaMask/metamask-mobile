import FCMService from '../services/FCMService';

type PermissionCheckSource =
  | 'cached'
  | 'controller_disabled'
  | 'in_flight'
  | 'started';

export interface PushNotificationStatus {
  controllerIsPushEnabled: boolean;
  effectivePushEnabled: boolean;
  nativeOsPermissionEnabled: boolean;
  permissionCheckSource: PermissionCheckSource;
}

interface ResolvePushNotificationStatusOptions {
  controllerIsPushEnabled: boolean;
  source: string;
}

let nativePermissionPromise: Promise<boolean> | null = null;
let cachedNativePermissionEnabled: boolean | null = null;
let nativePermissionRequestId = 0;

const createNativePermissionPromise = () => {
  const requestId = nativePermissionRequestId + 1;
  nativePermissionRequestId = requestId;

  nativePermissionPromise = FCMService.isPushNotificationsEnabled()
    .then(Boolean)
    .catch(() => false)
    .then((enabled) => {
      if (requestId === nativePermissionRequestId) {
        cachedNativePermissionEnabled = enabled;
      }
      return enabled;
    })
    .finally(() => {
      if (requestId === nativePermissionRequestId) {
        nativePermissionPromise = null;
      }
    });

  return nativePermissionPromise;
};

const getNativePermissionCheck = () => {
  if (cachedNativePermissionEnabled !== null) {
    return {
      permissionCheckSource: 'cached' as const,
      promise: Promise.resolve(cachedNativePermissionEnabled),
    };
  }

  if (nativePermissionPromise) {
    return {
      permissionCheckSource: 'in_flight' as const,
      promise: nativePermissionPromise,
    };
  }

  return {
    permissionCheckSource: 'started' as const,
    promise: createNativePermissionPromise(),
  };
};

export const clearPushNotificationStatusCache = () => {
  nativePermissionRequestId += 1;
  cachedNativePermissionEnabled = null;
  nativePermissionPromise = null;
};

export const setCachedNativePermissionEnabled = (enabled: boolean) => {
  nativePermissionRequestId += 1;
  cachedNativePermissionEnabled = enabled;
  nativePermissionPromise = null;
};

export const resolvePushNotificationStatus = async ({
  controllerIsPushEnabled,
}: ResolvePushNotificationStatusOptions): Promise<PushNotificationStatus> => {
  if (!controllerIsPushEnabled) {
    return {
      controllerIsPushEnabled,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
      permissionCheckSource: 'controller_disabled',
    };
  }

  const { permissionCheckSource, promise } = getNativePermissionCheck();
  const nativeOsPermissionEnabled = await promise;
  return {
    controllerIsPushEnabled,
    effectivePushEnabled: nativeOsPermissionEnabled,
    nativeOsPermissionEnabled,
    permissionCheckSource,
  };
};
