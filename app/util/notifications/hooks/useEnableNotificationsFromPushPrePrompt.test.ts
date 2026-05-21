import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  assertIsFeatureEnabled,
  enableNotifications,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import { useEnableNotificationsFromPushPrePrompt } from './useEnableNotificationsFromPushPrePrompt';

const mockSetMarketingNotificationsEnabled = jest.fn();

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

jest.mock('../../Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./useNotificationsMarketingConsent', () => ({
  useNotificationsMarketingConsent: () => ({
    setMarketingNotificationsEnabled: mockSetMarketingNotificationsEnabled,
  }),
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
    mockSetMarketingNotificationsEnabled.mockResolvedValue(undefined);
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

  it('passes marketing options and updates existing marketing preferences when enabling notifications from the prompt', async () => {
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    act(() => {
      result.current.enableNotificationsInBackground(true, {
        enableMarketingNotifications: true,
      });
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith({
        hasMarketingConsent: true,
        productAnnouncementEnabled: true,
        registerPushNotifications: true,
      });
    });
    expect(mockSetMarketingNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('enables marketing preferences without re-enabling notifications for the marketing prompt', async () => {
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    act(() => {
      result.current.enableMarketingNotificationsInBackground();
    });

    await waitFor(() => {
      expect(mockSetMarketingNotificationsEnabled).toHaveBeenCalledWith(true);
    });
    expect(enableNotifications).not.toHaveBeenCalled();
    expect(updateNotificationSubscriptionExpiration).not.toHaveBeenCalled();
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
    expect(Logger.error).toHaveBeenCalled();
  });

  it('treats feature gate assertion errors as denied', async () => {
    jest.mocked(assertIsFeatureEnabled).mockImplementation(() => {
      throw new Error('feature disabled');
    });
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    let nativePermissionEnabled = true;
    await act(async () => {
      nativePermissionEnabled = await result.current.requestPushPermission();
    });

    expect(nativePermissionEnabled).toBe(false);
    expect(requestPushPermissions).not.toHaveBeenCalled();
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
