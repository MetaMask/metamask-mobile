import FCMService from '../services/FCMService';
import { resolvePushNotificationStatus } from './push-notification-status';

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

  it('does not check native permission when controller push is disabled', async () => {
    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: false,
    });

    expect(mockIsPushNotificationsEnabled).not.toHaveBeenCalled();
    expect(status).toEqual({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: null,
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
});
