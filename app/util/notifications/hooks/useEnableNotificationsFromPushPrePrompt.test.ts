import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  assertIsFeatureEnabled,
  enableNotifications,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import { setCachedNativePermissionEnabled } from '../utils/push-notification-status';
import { useEnableNotificationsFromPushPrePrompt } from './useEnableNotificationsFromPushPrePrompt';

jest.mock('../../../actions/notification/helpers', () => ({
  assertIsFeatureEnabled: jest.fn(),
  enableNotifications: jest.fn(),
}));

jest.mock('../constants/notification-storage-keys', () => ({
  updateNotificationSubscriptionExpiration: jest.fn(),
}));

jest.mock('../services/NotificationService', () => ({
  requestPushPermissions: jest.fn(),
}));

jest.mock('../utils/push-notification-status', () => ({
  setCachedNativePermissionEnabled: jest.fn(),
}));

jest.mock('../utils/push-pre-prompt-performance', () => ({
  markPushPrePromptPerformance: jest.fn(),
}));

jest.mock('../../Logger', () => ({
  error: jest.fn(),
}));

describe('useEnableNotificationsFromPushPrePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assertIsFeatureEnabled).mockImplementation(() => undefined);
    jest.mocked(requestPushPermissions).mockResolvedValue(true);
    jest.mocked(enableNotifications).mockResolvedValue(undefined);
    jest
      .mocked(updateNotificationSubscriptionExpiration)
      .mockResolvedValue(undefined);
  });

  it('requests native push permission before MetaMask notification setup', async () => {
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    let nativePermissionEnabled = false;
    await act(async () => {
      nativePermissionEnabled = await result.current.requestPushPermission();
    });

    expect(nativePermissionEnabled).toBe(true);
    expect(requestPushPermissions).toHaveBeenCalledTimes(1);
    expect(setCachedNativePermissionEnabled).toHaveBeenCalledWith(true);
    expect(enableNotifications).not.toHaveBeenCalled();

    act(() => {
      result.current.enableNotificationsInBackground(nativePermissionEnabled);
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith({
        registerPushNotifications: true,
      });
    });
    expect(
      jest.mocked(requestPushPermissions).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(enableNotifications).mock.invocationCallOrder[0],
    );
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('enables in-app notifications without push registration when native permission is denied', async () => {
    jest.mocked(requestPushPermissions).mockResolvedValue(false);
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    let nativePermissionEnabled = true;
    await act(async () => {
      nativePermissionEnabled = await result.current.requestPushPermission();
    });

    expect(nativePermissionEnabled).toBe(false);
    expect(setCachedNativePermissionEnabled).toHaveBeenCalledWith(false);

    act(() => {
      result.current.enableNotificationsInBackground(nativePermissionEnabled);
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith({
        registerPushNotifications: false,
      });
    });
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('treats native permission request errors as denied', async () => {
    jest
      .mocked(requestPushPermissions)
      .mockRejectedValue(new Error('permission failed'));
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    let nativePermissionEnabled = true;
    await act(async () => {
      nativePermissionEnabled = await result.current.requestPushPermission();
    });

    expect(nativePermissionEnabled).toBe(false);
    expect(setCachedNativePermissionEnabled).toHaveBeenCalledWith(false);
    expect(Logger.error).toHaveBeenCalled();
  });

  it('logs background setup failures without throwing', async () => {
    jest
      .mocked(enableNotifications)
      .mockRejectedValue(new Error('setup failed'));
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    act(() => {
      result.current.enableNotificationsInBackground(true);
    });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalled();
    });
    expect(updateNotificationSubscriptionExpiration).not.toHaveBeenCalled();
  });
});
