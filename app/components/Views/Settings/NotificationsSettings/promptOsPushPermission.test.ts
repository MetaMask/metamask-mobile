import { AppState, type AppStateStatus } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import NotificationService, {
  canOsPromptForPushPermission,
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import Logger from '../../../../util/Logger';
import {
  LEAVE_FOREGROUND_TIMEOUT_MS,
  promptOsPushPermissionIfNeeded,
} from './promptOsPushPermission';

jest.mock('../../../../util/Logger');

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { requestPushNotificationsPermission: jest.fn() },
    canOsPromptForPushPermission: jest.fn(),
    isPushPermissionGranted: jest.fn(),
    isPushPermissionPromptable: jest.fn(),
    requestPushPermissions: jest.fn(),
  }),
);

describe('promptOsPushPermissionIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(canOsPromptForPushPermission).mockReturnValue(true);
  });

  it('returns true without prompting when permission is already granted', async () => {
    jest.mocked(isPushPermissionGranted).mockResolvedValue(true);

    await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(true);

    expect(isPushPermissionPromptable).not.toHaveBeenCalled();
    expect(requestPushPermissions).not.toHaveBeenCalled();
    expect(
      NotificationService.requestPushNotificationsPermission,
    ).not.toHaveBeenCalled();
  });

  it('requests OS permission when it is promptable', async () => {
    jest
      .mocked(isPushPermissionGranted)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    jest.mocked(isPushPermissionPromptable).mockResolvedValue(true);
    jest.mocked(requestPushPermissions).mockResolvedValue(true);

    await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(true);

    expect(requestPushPermissions).toHaveBeenCalledTimes(1);
    expect(
      NotificationService.requestPushNotificationsPermission,
    ).not.toHaveBeenCalled();
  });

  describe('when the OS cannot show its permission dialog', () => {
    let appStateListener: (state: AppStateStatus) => void;
    const removeSubscription = jest.fn();

    beforeEach(() => {
      jest.mocked(isPushPermissionPromptable).mockResolvedValue(false);
      Object.defineProperty(AppState, 'currentState', {
        value: 'active',
        configurable: true,
        writable: true,
      });
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_type, listener) => {
          appStateListener = listener;
          return { remove: removeSubscription };
        });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false without waiting when the Settings alert is dismissed', async () => {
      jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
      jest
        .mocked(NotificationService.requestPushNotificationsPermission)
        .mockResolvedValue(false);

      await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(false);

      expect(
        NotificationService.requestPushNotificationsPermission,
      ).toHaveBeenCalledTimes(1);
      expect(requestPushPermissions).not.toHaveBeenCalled();
      expect(AppState.addEventListener).not.toHaveBeenCalled();
    });

    it('reads the permission after the user returns from the system Settings', async () => {
      jest
        .mocked(isPushPermissionGranted)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      jest
        .mocked(NotificationService.requestPushNotificationsPermission)
        .mockResolvedValue(true);
      const onSettled = jest.fn();

      const result = promptOsPushPermissionIfNeeded().then((granted) => {
        onSettled();
        return granted;
      });
      await waitFor(() => expect(AppState.addEventListener).toHaveBeenCalled());
      appStateListener('background');
      await Promise.resolve();

      expect(onSettled).not.toHaveBeenCalled();

      appStateListener('active');

      await expect(result).resolves.toBe(true);
      expect(isPushPermissionGranted).toHaveBeenCalledTimes(2);
      expect(removeSubscription).toHaveBeenCalledTimes(1);
    });

    it('stops waiting when the app never leaves the foreground', async () => {
      jest.useFakeTimers();
      jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
      jest
        .mocked(NotificationService.requestPushNotificationsPermission)
        .mockResolvedValue(true);

      const result = promptOsPushPermissionIfNeeded();
      await waitFor(() => expect(AppState.addEventListener).toHaveBeenCalled());
      jest.advanceTimersByTime(LEAVE_FOREGROUND_TIMEOUT_MS);

      await expect(result).resolves.toBe(false);
      expect(removeSubscription).toHaveBeenCalledTimes(1);
    });

    it('routes Android API 32 to the Settings alert instead of the OS request', async () => {
      jest.mocked(canOsPromptForPushPermission).mockReturnValue(false);
      jest.mocked(isPushPermissionPromptable).mockResolvedValue(true);
      jest
        .mocked(isPushPermissionGranted)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      jest
        .mocked(NotificationService.requestPushNotificationsPermission)
        .mockResolvedValue(true);

      const result = promptOsPushPermissionIfNeeded();
      await waitFor(() => expect(AppState.addEventListener).toHaveBeenCalled());
      appStateListener('background');
      appStateListener('active');

      await expect(result).resolves.toBe(true);
      expect(requestPushPermissions).not.toHaveBeenCalled();
      expect(
        NotificationService.requestPushNotificationsPermission,
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('returns the current permission when the request fails', async () => {
    jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
    jest.mocked(isPushPermissionPromptable).mockResolvedValue(true);
    jest.mocked(requestPushPermissions).mockRejectedValue(new Error('Timeout'));

    await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(false);

    expect(Logger.error).toHaveBeenCalledTimes(1);
  });
});
