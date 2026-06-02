import {
  isPushPermissionGranted,
  isPushPermissionPromptable,
} from '../services/NotificationService';
import {
  resolveNativePushPermissionEnabled,
  resolveNativePushPermissionStatus,
  resolvePushNotificationStatus,
} from './push-notification-status';

jest.mock('../services/NotificationService', () => ({
  isPushPermissionGranted: jest.fn(),
  isPushPermissionPromptable: jest.fn(),
}));

const mockIsPushPermissionGranted = jest.mocked(isPushPermissionGranted);
const mockIsPushPermissionPromptable = jest.mocked(isPushPermissionPromptable);

describe('push-notification-status', () => {
  beforeEach(() => {
    mockIsPushPermissionGranted.mockReset();
    mockIsPushPermissionPromptable.mockReset();
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
    expect(mockIsPushPermissionPromptable).not.toHaveBeenCalled();
  });

  it('resolves promptable native push permission status', async () => {
    mockIsPushPermissionGranted.mockResolvedValue(false);
    mockIsPushPermissionPromptable.mockResolvedValue(true);

    const nativePushPermissionStatus =
      await resolveNativePushPermissionStatus();

    expect(nativePushPermissionStatus).toEqual({
      nativeOsPermissionEnabled: false,
      nativeOsPermissionPromptable: true,
    });
  });
});
