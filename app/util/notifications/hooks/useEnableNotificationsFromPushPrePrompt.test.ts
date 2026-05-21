import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';

import {
  assertIsFeatureEnabled,
  enableNotifications,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import Engine from '../../../core/Engine';
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

jest.mock('../../Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences';
const PUT_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences';
const CLIENT_TYPE = 'mobile';
const mockControllerMessengerCall = Engine.controllerMessenger
  .call as jest.Mock;

const buildNotificationPreferences = (
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [],
  },
  marketing: {
    inAppNotificationsEnabled: false,
    pushNotificationsEnabled: false,
  },
  perps: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  socialAI: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    txAmountLimit: 500,
    mutedTraderProfileIds: [],
  },
  ...overrides,
});

describe('useEnableNotificationsFromPushPrePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assertIsFeatureEnabled).mockImplementation(() => undefined);
    jest.mocked(requestPushPermissions).mockResolvedValue(true);
    jest.mocked(enableNotifications).mockResolvedValue(undefined);
    jest
      .mocked(updateNotificationSubscriptionExpiration)
      .mockResolvedValue(undefined);
    mockControllerMessengerCall.mockResolvedValue(null);
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

  it('seeds and persists marketing AUS preferences when enabling notifications from the prompt', async () => {
    const preferences = buildNotificationPreferences();
    mockControllerMessengerCall.mockImplementation(async (action: string) => {
      if (action === GET_NOTIFICATION_PREFERENCES_ACTION) {
        return preferences;
      }
      return undefined;
    });
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
    expect(mockControllerMessengerCall).toHaveBeenCalledWith(
      GET_NOTIFICATION_PREFERENCES_ACTION,
    );
    expect(mockControllerMessengerCall).toHaveBeenCalledWith(
      PUT_NOTIFICATION_PREFERENCES_ACTION,
      {
        ...preferences,
        marketing: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
      },
      CLIENT_TYPE,
    );
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('persists marketing AUS preferences without re-enabling notifications for the marketing prompt', async () => {
    const preferences = buildNotificationPreferences();
    mockControllerMessengerCall.mockImplementation(async (action: string) => {
      if (action === GET_NOTIFICATION_PREFERENCES_ACTION) {
        return preferences;
      }
      return undefined;
    });
    const { result } = renderHook(() =>
      useEnableNotificationsFromPushPrePrompt(),
    );

    act(() => {
      result.current.enableMarketingNotificationsInBackground();
    });

    await waitFor(() => {
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        PUT_NOTIFICATION_PREFERENCES_ACTION,
        {
          ...preferences,
          marketing: {
            inAppNotificationsEnabled: true,
            pushNotificationsEnabled: true,
          },
        },
        CLIENT_TYPE,
      );
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
