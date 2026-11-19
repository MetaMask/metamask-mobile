import Engine from '../../../core/Engine';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  assertIsFeatureEnabled,
  enableNotifications,
  hasNotificationPreferences,
  setMarketingNotificationPreferencesEnabled,
} from '../../../actions/notification/helpers';
import { updateNotificationSubscriptionExpiration } from '../constants/notification-storage-keys';
import { requestPushPermissions } from '../services/NotificationService';
import Logger from '../../Logger';
import { usePushPermissionNotificationSetup } from './usePushPermissionNotificationSetup';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: { state: { isUnlocked: true } },
    AuthenticationController: {
      state: { isSignedIn: true },
      performSignIn: jest.fn().mockResolvedValue(undefined),
    },
    NotificationServicesController: {
      state: { isUpdatingMetamaskNotifications: false },
    },
  },
}));

jest.mock('../../../actions/notification/helpers', () => ({
  assertIsFeatureEnabled: jest.fn(),
  enableNotifications: jest.fn(),
  hasNotificationPreferences: jest.fn(),
  setMarketingNotificationPreferencesEnabled: jest.fn(),
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

describe('usePushPermissionNotificationSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assertIsFeatureEnabled).mockImplementation(() => undefined);
    jest.mocked(requestPushPermissions).mockResolvedValue(true);
    jest.mocked(enableNotifications).mockResolvedValue(undefined);
    jest.mocked(hasNotificationPreferences).mockResolvedValue(false);
    jest
      .mocked(setMarketingNotificationPreferencesEnabled)
      .mockResolvedValue(undefined);
    jest
      .mocked(updateNotificationSubscriptionExpiration)
      .mockResolvedValue(undefined);
  });

  it('requests native push permission before MetaMask notification setup', async () => {
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

    let nativePermissionEnabled = false;
    await act(async () => {
      nativePermissionEnabled = await result.current.requestPushPermission();
    });

    expect(nativePermissionEnabled).toBe(true);
    expect(requestPushPermissions).toHaveBeenCalledTimes(1);
    expect(hasNotificationPreferences).not.toHaveBeenCalled();
    expect(enableNotifications).not.toHaveBeenCalled();

    act(() => {
      result.current.enableNotificationsInBackground(nativePermissionEnabled);
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith(
        {
          hasMarketingConsent: true,
          productAnnouncementEnabled: true,
          registerPushNotifications: true,
        },
        false,
      );
    });
    expect(
      jest.mocked(requestPushPermissions).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(hasNotificationPreferences).mock.invocationCallOrder[0],
    );
    expect(
      jest.mocked(hasNotificationPreferences).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(enableNotifications).mock.invocationCallOrder[0],
    );
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('passes marketing options when initializing notification preferences from the prompt', async () => {
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

    act(() => {
      result.current.enableNotificationsInBackground(true);
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith(
        {
          hasMarketingConsent: true,
          productAnnouncementEnabled: true,
          registerPushNotifications: true,
        },
        false,
      );
    });
    expect(setMarketingNotificationPreferencesEnabled).not.toHaveBeenCalled();
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('updates existing marketing preferences when enabling notifications from the prompt', async () => {
    jest.mocked(hasNotificationPreferences).mockResolvedValue(true);
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

    act(() => {
      result.current.enableNotificationsInBackground(true);
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith(
        {
          registerPushNotifications: true,
        },
        false,
      );
    });
    await waitFor(() =>
      expect(setMarketingNotificationPreferencesEnabled).toHaveBeenCalledWith(
        true,
      ),
    );
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('enables in-app notifications without push registration when native permission is denied', async () => {
    jest.mocked(requestPushPermissions).mockResolvedValue(false);
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

    let nativePermissionEnabled = true;
    await act(async () => {
      nativePermissionEnabled = await result.current.requestPushPermission();
    });

    expect(nativePermissionEnabled).toBe(false);

    act(() => {
      result.current.enableNotificationsInBackground(nativePermissionEnabled);
    });

    await waitFor(() => {
      expect(enableNotifications).toHaveBeenCalledWith(
        {
          hasMarketingConsent: true,
          productAnnouncementEnabled: true,
          registerPushNotifications: false,
        },
        false,
      );
    });
    expect(updateNotificationSubscriptionExpiration).toHaveBeenCalledTimes(1);
  });

  it('treats native permission request errors as denied', async () => {
    jest
      .mocked(requestPushPermissions)
      .mockRejectedValue(new Error('permission failed'));
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

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
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

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
    const { result } = renderHook(() => usePushPermissionNotificationSetup());

    act(() => {
      result.current.enableNotificationsInBackground(true);
    });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalled();
    });
    expect(updateNotificationSubscriptionExpiration).not.toHaveBeenCalled();
  });
  it.each(['locked', 'signed out', 'updating', 'denied'])(
    'does not opt in during onboarding when %s',
    async (condition) => {
      Engine.context.KeyringController.state.isUnlocked =
        condition !== 'locked';
      Engine.context.AuthenticationController.state.isSignedIn =
        condition !== 'signed out';
      Engine.context.NotificationServicesController.state.isUpdatingMetamaskNotifications =
        condition === 'updating';
      const { result } = renderHook(() =>
        usePushPermissionNotificationSetup({ onboarding: true }),
      );

      let enabled: boolean | undefined;
      await act(async () => {
        enabled = await result.current.enableNotificationsInBackground(
          condition !== 'denied',
        );
      });

      expect(enabled).toBe(false);
      expect(enableNotifications).not.toHaveBeenCalled();
      expect(setMarketingNotificationPreferencesEnabled).not.toHaveBeenCalled();
      Engine.context.KeyringController.state.isUnlocked = true;
      Engine.context.AuthenticationController.state.isSignedIn = true;
      Engine.context.NotificationServicesController.state.isUpdatingMetamaskNotifications = false;
    },
  );
  it('completes explicit sign-in before onboarding setup', async () => {
    Engine.context.AuthenticationController.state.isSignedIn = false;
    jest
      .mocked(Engine.context.AuthenticationController.performSignIn)
      .mockImplementationOnce(async () => {
        Engine.context.AuthenticationController.state.isSignedIn = true;
        return ['token'];
      });
    const { result } = renderHook(() =>
      usePushPermissionNotificationSetup({ onboarding: true }),
    );

    await act(async () => {
      await result.current.enableNotificationsInBackground(true);
    });

    expect(
      Engine.context.AuthenticationController.performSignIn,
    ).toHaveBeenCalledTimes(1);
    expect(enableNotifications).toHaveBeenCalledWith(
      {
        hasMarketingConsent: true,
        productAnnouncementEnabled: true,
        registerPushNotifications: true,
      },
      true,
    );
  });
});
