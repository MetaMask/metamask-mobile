import FCMService from '../services/FCMService';
import {
  clearPushNotificationStatusCache,
  resolvePushNotificationStatus,
  setCachedNativePermissionEnabled,
} from './push-notification-status';

jest.mock('../services/FCMService', () => ({
  __esModule: true,
  default: {
    isPushNotificationsEnabled: jest.fn(),
  },
}));

const mockIsPushNotificationsEnabled = jest.mocked(
  FCMService.isPushNotificationsEnabled,
);

describe('push-notification-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPushNotificationStatusCache();
  });

  it('does not check native permission when controller push is disabled', async () => {
    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: false,
      source: 'test',
    });

    expect(mockIsPushNotificationsEnabled).not.toHaveBeenCalled();
    expect(status).toEqual({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: null,
      permissionCheckSource: 'controller_disabled',
    });
  });

  it('dedupes in-flight native permission checks', async () => {
    let resolveNativePermission: ((enabled: boolean) => void) | undefined;
    mockIsPushNotificationsEnabled.mockReturnValue(
      new Promise((resolve) => {
        resolveNativePermission = resolve;
      }),
    );

    const firstStatus = resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'first',
    });
    const secondStatus = resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'second',
    });

    expect(mockIsPushNotificationsEnabled).toHaveBeenCalledTimes(1);

    resolveNativePermission?.(true);

    await expect(firstStatus).resolves.toMatchObject({
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
      permissionCheckSource: 'started',
    });
    await expect(secondStatus).resolves.toMatchObject({
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
      permissionCheckSource: 'in_flight',
    });
  });

  it('uses the cached native permission result after the first check resolves', async () => {
    mockIsPushNotificationsEnabled.mockResolvedValue(true);

    await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'first',
    });
    const secondStatus = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'second',
    });

    expect(mockIsPushNotificationsEnabled).toHaveBeenCalledTimes(1);
    expect(secondStatus).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
      permissionCheckSource: 'cached',
    });
  });

  it('uses a manually cached native permission result without checking native permission', async () => {
    setCachedNativePermissionEnabled(true);

    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'test',
    });

    expect(mockIsPushNotificationsEnabled).not.toHaveBeenCalled();
    expect(status).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
      permissionCheckSource: 'cached',
    });
  });

  it('does not let a stale in-flight check overwrite a manually cached result', async () => {
    let resolveNativePermission: ((enabled: boolean) => void) | undefined;
    mockIsPushNotificationsEnabled.mockReturnValue(
      new Promise((resolve) => {
        resolveNativePermission = resolve;
      }),
    );

    const pendingStatus = resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'pending',
    });

    setCachedNativePermissionEnabled(true);
    resolveNativePermission?.(false);

    await expect(pendingStatus).resolves.toMatchObject({
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
      permissionCheckSource: 'started',
    });

    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'cached',
    });

    expect(status).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
      permissionCheckSource: 'cached',
    });
  });

  it('treats native permission errors as disabled push', async () => {
    mockIsPushNotificationsEnabled.mockRejectedValue(new Error('nope'));

    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
      source: 'test',
    });

    expect(status).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
      permissionCheckSource: 'started',
    });
  });
});
