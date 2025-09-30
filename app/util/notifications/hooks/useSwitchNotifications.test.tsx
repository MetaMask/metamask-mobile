import { act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
// eslint-disable-next-line import/no-namespace
import * as Actions from '../../../actions/notification/helpers';
// eslint-disable-next-line import/no-namespace
import * as Selectors from '../../../selectors/notifications';
import { renderHookWithProvider } from '../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as UseNotificationsModule from './useNotifications';
import {
  useAccountNotificationsToggle,
  useFeatureAnnouncementToggle,
  useFetchAccountNotifications,
  useNotificationsToggle,
  useSwitchNotificationLoadingText,
} from './useSwitchNotifications';

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  isNotificationsFeatureEnabled: () => true,
}));

describe('useSwitchNotifications - useNotificationsToggle', () => {
  const arrangeMocks = () => {
    const mockEnableNotifications = jest.fn();
    const mockUseEnableNotifications = jest
      .spyOn(UseNotificationsModule, 'useEnableNotifications')
      .mockReturnValue({
        data: true,
        isEnablingNotifications: false,
        isEnablingPushNotifications: false,
        loading: false,
        error: null,
        enableNotifications: mockEnableNotifications,
      });

    const mockDisableNotifications = jest.fn();
    const mockUseDisableNotifications = jest
      .spyOn(UseNotificationsModule, 'useDisableNotifications')
      .mockReturnValue({
        data: true,
        loading: false,
        error: null,
        disableNotifications: mockDisableNotifications,
      });

    return {
      mockEnableNotifications,
      mockUseEnableNotifications,
      mockDisableNotifications,
      mockUseDisableNotifications,
    };
  };

  const arrangeAct = async (val: boolean) => {
    // Arrange
    const mocks = arrangeMocks();
    const hook = renderHookWithProvider(() => useNotificationsToggle());

    // Act
    await act(() => hook.result.current.switchNotifications(val));

    return { mocks, hook };
  };

  it('performs enable switch', async () => {
    const { mocks } = await arrangeAct(true);
    await waitFor(() =>
      expect(mocks.mockEnableNotifications).toHaveBeenCalled(),
    );
    expect(mocks.mockDisableNotifications).not.toHaveBeenCalled();
  });

  it('performs disable switch', async () => {
    const { mocks } = await arrangeAct(false);
    await waitFor(() =>
      expect(mocks.mockDisableNotifications).toHaveBeenCalled(),
    );
    expect(mocks.mockEnableNotifications).not.toHaveBeenCalled();
  });
});

describe('useSwitchNotifications - useFeatureAnnouncementToggle()', () => {
  const arrangeMocks = () => {
    const mockListNotifications = jest.fn();
    const mockUseListNotifications = jest
      .spyOn(UseNotificationsModule, 'useListNotifications')
      .mockReturnValue({
        error: null,
        isLoading: false,
        notificationsData: [],
        listNotifications: mockListNotifications,
      });

    const mockSelectIsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(true);
    const mockSelectIsFeatureAnnouncementsEnabled = jest
      .spyOn(Selectors, 'selectIsFeatureAnnouncementsEnabled')
      .mockReturnValue(true);

    const mockToggleFeatureAnnouncement = jest
      .spyOn(Actions, 'toggleFeatureAnnouncements')
      .mockImplementation(jest.fn());

    return {
      mockListNotifications,
      mockUseListNotifications,
      mockSelectIsEnabled,
      mockSelectIsFeatureAnnouncementsEnabled,
      mockToggleFeatureAnnouncement,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeAct = async (val: boolean, mutateMocks?: (m: Mocks) => void) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);
    const hook = renderHookWithProvider(() => useFeatureAnnouncementToggle());

    // Act
    await act(() => hook.result.current.switchFeatureAnnouncements(val));

    return { mocks, hook };
  };

  it('performs enable flow', async () => {
    const { mocks } = await arrangeAct(true);
    await waitFor(() =>
      expect(mocks.mockToggleFeatureAnnouncement).toHaveBeenCalledWith(true),
    );
    await waitFor(() => expect(mocks.mockListNotifications).toHaveBeenCalled());
  });

  it('performs disable flow', async () => {
    const { mocks } = await arrangeAct(false);
    await waitFor(() =>
      expect(mocks.mockToggleFeatureAnnouncement).toHaveBeenCalledWith(false),
    );
    await waitFor(() => expect(mocks.mockListNotifications).toHaveBeenCalled());
  });

  it('bails if notifications are not enabled', async () => {
    const { mocks } = await arrangeAct(true, (m) =>
      m.mockSelectIsEnabled.mockReturnValue(false),
    );
    await waitFor(() =>
      expect(mocks.mockToggleFeatureAnnouncement).not.toHaveBeenCalledWith(
        true,
      ),
    );
    await waitFor(() =>
      expect(mocks.mockListNotifications).not.toHaveBeenCalled(),
    );
  });
});

describe('useSwitchNotifications - useFetchAccountNotifications()', () => {
  const arrangeMocks = () => {
    const mockSelectIsUpdatingMetamaskNotificationsAccount = jest
      .spyOn(Selectors, 'selectIsUpdatingMetamaskNotificationsAccount')
      .mockReturnValue([]);

    const mockSelectIsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(true);

    const mockFetchAccountNotificationSettings = jest
      .spyOn(Actions, 'fetchAccountNotificationSettings')
      .mockResolvedValue({});

    return {
      mockFetchAccountNotificationSettings,
      mockSelectIsEnabled,
      mockSelectIsUpdatingMetamaskNotificationsAccount,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeActCallback = async (
    accounts: string[],
    mutateMocks?: (m: Mocks) => void,
  ) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);
    const hook = renderHookWithProvider(() =>
      useFetchAccountNotifications(accounts),
    );

    // Act
    await act(async () => {
      await hook.result.current.update(accounts);
    });

    return { mocks, hook };
  };

  const arrangeActEffect = async (
    accounts: string[],
    mutateMocks?: (m: Mocks) => void,
  ) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);

    // Act - render hook (which will invoke effect)
    const hook = renderHookWithProvider(() =>
      useFetchAccountNotifications(accounts),
    );

    return { mocks, hook };
  };

  it('fetches account notifications successfully', async () => {
    const accounts = ['0x123', '0x456'];
    const { mocks, hook } = await arrangeActCallback(accounts);
    await waitFor(() =>
      expect(mocks.mockFetchAccountNotificationSettings).toHaveBeenCalledWith(
        accounts,
      ),
    );
    expect(hook.result.current.data).toEqual({});
    expect(hook.result.current.error).toBeNull();
  });

  it('returns error if fails to fetch', async () => {
    const accounts = ['0x123', '0x456'];
    const errorMessage = 'Failed to get account settings';
    const { mocks, hook } = await arrangeActCallback(accounts, (m) => {
      m.mockFetchAccountNotificationSettings.mockRejectedValue(
        new Error(errorMessage),
      );
    });
    await waitFor(() =>
      expect(mocks.mockFetchAccountNotificationSettings).toHaveBeenCalledWith(
        accounts,
      ),
    );
    expect(hook.result.current.error).toBe(errorMessage);
  });

  it('does not fetch if notifications are not enabled', async () => {
    const accounts = ['0x123', '0x456'];
    const { mocks } = await arrangeActCallback(accounts, (m) => {
      m.mockSelectIsEnabled.mockReturnValue(false);
    });
    await waitFor(() =>
      expect(mocks.mockFetchAccountNotificationSettings).not.toHaveBeenCalled(),
    );
  });

  it('invokes effect fetch account notifications', async () => {
    const accounts = ['0x123', '0x456'];
    const { mocks } = await arrangeActEffect(accounts);
    await waitFor(() =>
      expect(mocks.mockFetchAccountNotificationSettings).toHaveBeenCalled(),
    );
  });

  it('does not invoke effect fetch if notifications are not enabled', async () => {
    const accounts = ['0x123', '0x456'];
    const { mocks } = await arrangeActEffect(accounts, (m) => {
      m.mockSelectIsEnabled.mockReturnValue(false);
    });
    await waitFor(() =>
      expect(mocks.mockFetchAccountNotificationSettings).not.toHaveBeenCalled(),
    );
  });

  it('does not invoke effect fetch if there are no accounts', async () => {
    const accounts: string[] = [];
    const { mocks } = await arrangeActEffect(accounts);
    await waitFor(() =>
      expect(mocks.mockFetchAccountNotificationSettings).not.toHaveBeenCalled(),
    );
  });
});

describe('useSwitchNotifications - useAccountNotificationsToggle()', () => {
  const arrangeMocks = () => {
    const mockListNotifications = jest.fn();
    const mockUseListNotifications = jest
      .spyOn(UseNotificationsModule, 'useListNotifications')
      .mockReturnValue({
        error: null,
        isLoading: false,
        notificationsData: [],
        listNotifications: mockListNotifications,
      });

    const mockEnableAccounts = jest
      .spyOn(Actions, 'enableAccounts')
      .mockImplementation(jest.fn());

    const mockDisableAccounts = jest
      .spyOn(Actions, 'disableAccounts')
      .mockImplementation(jest.fn());

    return {
      mockEnableAccounts,
      mockDisableAccounts,
      mockListNotifications,
      mockUseListNotifications,
    };
  };

  const arrangeAct = async (
    addresses: string[],
    state: boolean,
    mutateMocks?: (m: ReturnType<typeof arrangeMocks>) => void,
  ) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);
    const hook = renderHookWithProvider(() => useAccountNotificationsToggle());

    // Act
    await act(async () => {
      await hook.result.current.onToggle(addresses, state);
    });

    return { mocks, hook };
  };

  it('creates notifications for account', async () => {
    const addresses = ['0x123', '0x456'];
    const { mocks } = await arrangeAct(addresses, true);
    await waitFor(() =>
      expect(mocks.mockEnableAccounts).toHaveBeenCalledWith(addresses),
    );
    await waitFor(() =>
      expect(mocks.mockDisableAccounts).not.toHaveBeenCalled(),
    );
    await waitFor(() => expect(mocks.mockListNotifications).toHaveBeenCalled());
  });

  it('deletes notifications for account', async () => {
    const addresses = ['0x123', '0x456'];
    const { mocks } = await arrangeAct(addresses, false);
    await waitFor(() =>
      expect(mocks.mockDisableAccounts).toHaveBeenCalledWith(addresses),
    );
    await waitFor(() =>
      expect(mocks.mockEnableAccounts).not.toHaveBeenCalled(),
    );
    await waitFor(() => expect(mocks.mockListNotifications).toHaveBeenCalled());
  });

  it('handles error during create notifications', async () => {
    const addresses = ['0x123', '0x456'];
    const errorMessage = 'Failed to create notifications';
    const { mocks, hook } = await arrangeAct(addresses, true, (m) => {
      m.mockEnableAccounts.mockRejectedValue(new Error(errorMessage));
    });
    await waitFor(() =>
      expect(mocks.mockEnableAccounts).toHaveBeenCalledWith(addresses),
    );
    expect(hook.result.current.error).toBe(errorMessage);
  });

  it('handles error during delete notifications', async () => {
    const addresses = ['0x123', '0x456'];
    const errorMessage = 'Failed to delete notifications';
    const { mocks, hook } = await arrangeAct(addresses, false, (m) => {
      m.mockDisableAccounts.mockRejectedValue(new Error(errorMessage));
    });
    await waitFor(() =>
      expect(mocks.mockDisableAccounts).toHaveBeenCalledWith(addresses),
    );
    expect(hook.result.current.error).toBe(errorMessage);
  });
});

describe('useSwitchNotifications - useSwitchNotificationLoadingText()', () => {
  const arrangeMocks = () => {
    const mockSelectIsUpdatingMetamaskNotifications = jest
      .spyOn(Selectors, 'selectIsUpdatingMetamaskNotifications')
      .mockReturnValue(false);

    const mockSelectIsMetamaskNotificationsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(false);

    const mockSelectIsMetaMaskPushNotificationsLoading = jest
      .spyOn(Selectors, 'selectIsMetaMaskPushNotificationsLoading')
      .mockReturnValue(false);

    const mockSelectIsMetaMaskPushNotificationsEnabled = jest
      .spyOn(Selectors, 'selectIsMetaMaskPushNotificationsEnabled')
      .mockReturnValue(false);

    const mockSelectIsUpdatingMetamaskNotificationsAccount = jest
      .spyOn(Selectors, 'selectIsUpdatingMetamaskNotificationsAccount')
      .mockReturnValue([]);

    return {
      mockSelectIsUpdatingMetamaskNotifications,
      mockSelectIsMetamaskNotificationsEnabled,
      mockSelectIsMetaMaskPushNotificationsLoading,
      mockSelectIsMetaMaskPushNotificationsEnabled,
      mockSelectIsUpdatingMetamaskNotificationsAccount,
    };
  };

  const arrangeAct = (
    mutateMocks?: (m: ReturnType<typeof arrangeMocks>) => void,
  ) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);
    const hook = renderHookWithProvider(() =>
      useSwitchNotificationLoadingText(),
    );

    return { mocks, hook };
  };

  it('returns disabling notifications text when notifications are being disabled', () => {
    const { hook } = arrangeAct((m) => {
      m.mockSelectIsUpdatingMetamaskNotifications.mockReturnValue(true);
      m.mockSelectIsMetamaskNotificationsEnabled.mockReturnValue(true);
    });
    expect(hook.result.current).toBe(
      strings('app_settings.updating_notifications'),
    );
  });

  it('returns enabling notifications text when notifications are being enabled', () => {
    const { hook } = arrangeAct((m) => {
      m.mockSelectIsUpdatingMetamaskNotifications.mockReturnValue(true);
      m.mockSelectIsMetamaskNotificationsEnabled.mockReturnValue(false);
    });
    expect(hook.result.current).toBe(
      strings('app_settings.updating_notifications'),
    );
  });

  it('returns disabling notifications text when push notifications are being disabled', () => {
    const { hook } = arrangeAct((m) => {
      m.mockSelectIsMetaMaskPushNotificationsEnabled.mockReturnValue(true);
      m.mockSelectIsMetaMaskPushNotificationsLoading.mockReturnValue(true);
    });
    expect(hook.result.current).toBe(
      strings('app_settings.updating_notifications'),
    );
  });

  it('returns enabling notifications text when push notifications are being enabled', () => {
    const { hook } = arrangeAct((m) => {
      m.mockSelectIsMetaMaskPushNotificationsEnabled.mockReturnValue(false);
      m.mockSelectIsMetaMaskPushNotificationsLoading.mockReturnValue(true);
    });
    expect(hook.result.current).toBe(
      strings('app_settings.updating_notifications'),
    );
  });

  it('returns updating account settings text when accounts are being updated', () => {
    const { hook } = arrangeAct((m) => {
      m.mockSelectIsUpdatingMetamaskNotificationsAccount.mockReturnValue([
        '0xAddr1',
      ]);
    });
    expect(hook.result.current).toBe(
      strings('app_settings.updating_account_settings'),
    );
  });

  it('returns undefined when no loading state is active', () => {
    const { hook } = arrangeAct();
    expect(hook.result.current).toBeUndefined();
  });
});
