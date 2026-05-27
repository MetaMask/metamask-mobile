import { isPushPermissionGranted } from '../services/NotificationService';
import {
  resolveNativePushPermissionEnabled,
  resolvePushNotificationStatus,
} from './push-notification-status';

jest.mock('../services/NotificationService', () => ({
  isPushPermissionGranted: jest.fn(),
}));

const mockIsPushPermissionGranted = jest.mocked(isPushPermissionGranted);

describe('push-notification-status', () => {
  beforeEach(() => {
    mockIsPushPermissionGranted.mockReset();
  });

  it('checks native permission when controller push is disabled', async () => {
    mockIsPushPermissionGranted.mockResolvedValue(true);

    const status = await resolvePushNotificationStatus({
      controllerIsPushEnabled: false,
    });

    expect(mockIsPushPermissionGranted).toHaveBeenCalledTimes(1);
    expect(status).toEqual({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: true,
    });
  });

  it('checks native permission each time push is enabled', async () => {
    mockIsPushPermissionGranted
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const firstStatus = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
    });
    const secondStatus = await resolvePushNotificationStatus({
      controllerIsPushEnabled: true,
    });

    expect(mockIsPushPermissionGranted).toHaveBeenCalledTimes(2);
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
    mockIsPushPermissionGranted.mockRejectedValue(new Error('nope'));

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
    mockIsPushPermissionGranted.mockResolvedValue(true);

    const nativePushPermissionEnabled =
      await resolveNativePushPermissionEnabled();

    expect(nativePushPermissionEnabled).toBe(true);
    expect(mockIsPushPermissionGranted).toHaveBeenCalledTimes(1);
  });
});
