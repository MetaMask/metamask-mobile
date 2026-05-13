import FCMService from '../services/FCMService';
import { markPushPrePromptPerformance } from './push-pre-prompt-performance';

type PermissionCheckSource =
  | 'cached'
  | 'controller_disabled'
  | 'in_flight'
  | 'started';

export interface PushNotificationStatus {
  controllerIsPushEnabled: boolean;
  effectivePushEnabled: boolean;
  nativeOsPermissionEnabled: boolean | null;
  permissionCheckSource: PermissionCheckSource;
}

interface ResolvePushNotificationStatusOptions {
  controllerIsPushEnabled: boolean;
  source: string;
}

let nativePermissionPromise: Promise<boolean> | null = null;
let cachedNativePermissionEnabled: boolean | null = null;
let nativePermissionRequestId = 0;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const createNativePermissionPromise = () => {
  const requestId = nativePermissionRequestId + 1;
  nativePermissionRequestId = requestId;

  nativePermissionPromise = FCMService.isPushNotificationsEnabled()
    .then(Boolean)
    .catch((error) => {
      markPushPrePromptPerformance('push_status.native_permission.error', {
        error: getErrorMessage(error),
      });
      return false;
    })
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
  source,
}: ResolvePushNotificationStatusOptions): Promise<PushNotificationStatus> => {
  const startedAt = Date.now();
  markPushPrePromptPerformance('push_status.resolve.start', {
    controllerIsPushEnabled,
    source,
  });

  if (!controllerIsPushEnabled) {
    const status: PushNotificationStatus = {
      controllerIsPushEnabled,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: null,
      permissionCheckSource: 'controller_disabled',
    };
    markPushPrePromptPerformance('push_status.resolve.end', {
      ...status,
      durationMs: Date.now() - startedAt,
      source,
    });
    return status;
  }

  const { permissionCheckSource, promise } = getNativePermissionCheck();
  const nativeOsPermissionEnabled = await promise;
  const status: PushNotificationStatus = {
    controllerIsPushEnabled,
    effectivePushEnabled: nativeOsPermissionEnabled,
    nativeOsPermissionEnabled,
    permissionCheckSource,
  };

  markPushPrePromptPerformance('push_status.resolve.end', {
    ...status,
    durationMs: Date.now() - startedAt,
    source,
  });

  return status;
};
