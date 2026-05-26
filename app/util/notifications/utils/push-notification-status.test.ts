import FCMService from '../services/FCMService';
import {
  resolveNativePushPermissionEnabled,
  resolvePushNotificationStatus,
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
    mockIsPushNotificationsEnabled.mockReset();
  });

  it('checks native permission when controller push is disabled', async () => {
    mockIsPushNotificationsEnabled.mockResolvedValue(true);

    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: false,
    });

    expect(mockIsPushNotificationsEnabled).toHaveBeenCalledTimes(1);
    expect(status).toEqual({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: true,
    });
  });

  it('checks native permission each time push is enabled', async () => {
    mockIsPushNotificationsEnabled
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const firstStatus = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
    });
    const secondStatus = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
    });

    expect(mockIsPushNotificationsEnabled).toHaveBeenCalledTimes(2);
    expect(firstStatus).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
    });
    expect(secondStatus).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });
  });

  it('treats native permission errors as disabled push', async () => {
    mockIsPushNotificationsEnabled.mockRejectedValue(new Error('nope'));

    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
    });

    expect(status).toEqual({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });
  });

  it('resolves native push permission without controller state', async () => {
    mockIsPushNotificationsEnabled.mockResolvedValue(true);

    const nativePushPermissionEnabled =
      await resolveNativePushPermissionEnabled();

    expect(nativePushPermissionEnabled).toBe(true);
    expect(mockIsPushNotificationsEnabled).toHaveBeenCalledTimes(1);
  });
});
