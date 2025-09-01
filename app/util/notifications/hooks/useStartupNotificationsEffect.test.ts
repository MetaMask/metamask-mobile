import { waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as ReactRedux from 'react-redux';

// eslint-disable-next-line import/no-namespace
import * as Selectors from '../../../selectors/notifications';
// eslint-disable-next-line import/no-namespace
import * as KeyringSelectors from '../../../selectors/keyringController';
// eslint-disable-next-line import/no-namespace
import * as SettingsSelectors from '../../../selectors/settings';
// eslint-disable-next-line import/no-namespace
import * as IdentitySelectors from '../../../selectors/identity';
import storageWrapper from '../../../store/storage-wrapper';
import { renderHookWithProvider } from '../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as Constants from '../constants/config';
// eslint-disable-next-line import/no-namespace
import * as NotificationHooks from './useNotifications';
// eslint-disable-next-line import/no-namespace
import * as StorageHooks from '../../../store/storage-wrapper-hooks';
import {
  useRegisterAndFetchNotifications,
  useEnableNotificationsByDefaultEffect,
} from './useStartupNotificationsEffect';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('useRegisterAndFetchNotifications', () => {
  const arrangeHooks = () => {
    const mockEnableNotifications = jest.fn();
    const mockListNotifications = jest.fn();

    const mockUseEnableNotifications = jest.spyOn(
      NotificationHooks,
      'useEnableNotifications',
    );
    const mockUseListNotifications = jest.spyOn(
      NotificationHooks,
      'useListNotifications',
    );

    mockUseEnableNotifications.mockReturnValue({
      enableNotifications: mockEnableNotifications,
      error: null,
      data: true,
      isEnablingNotifications: false,
      isEnablingPushNotifications: false,
      loading: false,
    });

    mockUseListNotifications.mockReturnValue({
      listNotifications: mockListNotifications,
      notificationsData: [],
      isLoading: false,
      error: undefined,
    });

    return {
      enableNotifications: mockEnableNotifications,
      listNotifications: mockListNotifications,
      mockUseEnableNotifications,
      mockUseListNotifications,
    };
  };

  const arrangeSelectors = () => {
    const mockIsNotifsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(true);

    const mockSelectBasicFunctionalityEnabled = jest
      .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
      .mockReturnValue(true);

    const mockSelectIsUnlocked = jest
      .spyOn(KeyringSelectors, 'selectIsUnlocked')
      .mockReturnValue(true);

    const mockSelectIsSignedIn = jest.spyOn(
      IdentitySelectors,
      'selectIsSignedIn',
    );

    return {
      mockIsNotifsEnabled,
      mockSelectBasicFunctionalityEnabled,
      mockSelectIsUnlocked,
      mockSelectIsSignedIn,
    };
  };

  const arrange = () => {
    const mockGetStorageItem = jest
      .spyOn(storageWrapper, 'getItem')
      .mockResolvedValue(undefined);
    const mockSetStorageItem = jest.spyOn(storageWrapper, 'setItem');
    const mockIsFlagEnabled = jest
      .spyOn(Constants, 'isNotificationsFeatureEnabled')
      .mockReturnValue(true);

    return {
      hooks: arrangeHooks(),
      selectors: arrangeSelectors(),
      helpers: {
        mockGetStorageItem,
        mockSetStorageItem,
        mockIsFlagEnabled,
      },
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enables and fetches notifications when all conditions are met', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });

  it('does not enable notifications if resubscription has not expired', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    // Has not expired
    mocks.helpers.mockGetStorageItem.mockResolvedValue(Date.now() + 1000);

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });

  it('deos not fetch notifications when basic functionality is disabled', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(false);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not fetch notifications when notifications are disabled', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(false);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not fetch notifications when user is not signed in', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(false);

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not fetch notifications when wallet is locked', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(false);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('handles enableNotifications error gracefully', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);
    mocks.hooks.enableNotifications.mockRejectedValueOnce(
      new Error('Enable failed'),
    );

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
    });
  });

  it('handles listNotifications error gracefully', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);
    mocks.hooks.listNotifications.mockRejectedValueOnce(
      new Error('List failed'),
    );

    renderHookWithProvider(() => useRegisterAndFetchNotifications(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });

  it('re-runs effect when dependencies change', async () => {
    const mocks = arrange();

    // Mocking useSelector so it does not memoize the selectors passed in.
    const originalUseSelector = ReactRedux.useSelector;
    jest.spyOn(ReactRedux, 'useSelector').mockImplementation((selector) => {
      // Ensure the selector input is a new reference
      const wrappedSelector = (state: unknown) => selector(state);
      return originalUseSelector(wrappedSelector);
    });

    // First render - conditions not met
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(false);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    const { rerender } = renderHookWithProvider(
      () => useRegisterAndFetchNotifications(),
      {},
    );

    // Second render - conditions met
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(true);

    rerender({});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });
});

describe('useEnableNotificationsByDefaultEffect', () => {
  const arrangeHooks = () => {
    const mockEnableNotifications = jest.fn();
    const mockListNotifications = jest.fn();
    const mockUseEnableNotifications = jest.spyOn(
      NotificationHooks,
      'useEnableNotifications',
    );
    const mockUseListNotifications = jest.spyOn(
      NotificationHooks,
      'useListNotifications',
    );

    mockUseEnableNotifications.mockReturnValue({
      enableNotifications: mockEnableNotifications,
      error: null,
      data: true,
      isEnablingNotifications: false,
      isEnablingPushNotifications: false,
      loading: false,
    });

    mockUseListNotifications.mockReturnValue({
      listNotifications: mockListNotifications,
      notificationsData: [],
      isLoading: false,
      error: undefined,
    });

    return {
      enableNotifications: mockEnableNotifications,
      listNotifications: mockListNotifications,
      mockUseEnableNotifications,
      mockUseListNotifications,
    };
  };

  const arrangeSelectors = () => {
    const mockIsNotifsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(false); // Default to false for enabling by default tests
    const mockSelectBasicFunctionalityEnabled = jest
      .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
      .mockReturnValue(true);
    const mockSelectIsUnlocked = jest
      .spyOn(KeyringSelectors, 'selectIsUnlocked')
      .mockReturnValue(true);
    const mockSelectIsSignedIn = jest
      .spyOn(IdentitySelectors, 'selectIsSignedIn')
      .mockReturnValue(true);
    const mockGetIsNotificationEnabledByDefaultFeatureFlag = jest
      .spyOn(Selectors, 'getIsNotificationEnabledByDefaultFeatureFlag')
      .mockReturnValue(true);

    return {
      mockIsNotifsEnabled,
      mockSelectBasicFunctionalityEnabled,
      mockSelectIsUnlocked,
      mockSelectIsSignedIn,
      mockGetIsNotificationEnabledByDefaultFeatureFlag,
    };
  };

  const arrange = () => {
    const mockGetStorageItem = jest
      .spyOn(storageWrapper, 'getItem')
      .mockResolvedValue(undefined);
    const mockSetStorageItem = jest.spyOn(storageWrapper, 'setItem');
    const mockIsFlagEnabled = jest
      .spyOn(Constants, 'isNotificationsFeatureEnabled')
      .mockReturnValue(true);

    // Mock useStorageValue for Solana modal - default to closed
    const mockUseStorageValue = jest.spyOn(StorageHooks, 'useStorageValue');
    mockUseStorageValue.mockReturnValue({
      loading: false,
      value: 'true',
      setValue: jest.fn(),
      error: null,
    });

    return {
      hooks: arrangeHooks(),
      selectors: arrangeSelectors(),
      helpers: {
        mockGetStorageItem,
        mockSetStorageItem,
        mockIsFlagEnabled,
        mockUseStorageValue,
      },
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enables notifications by default when all conditions are met and user has not turned off notifications', async () => {
    const mocks = arrange();

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });

  it('does not enable notifications when solana modal is still loading', async () => {
    const mocks = arrange();
    // Override default mock for this test
    mocks.helpers.mockUseStorageValue.mockReturnValue({
      loading: true,
      value: null,
      setValue: jest.fn(),
      error: null,
    });

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});
    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when solana modal is not closed', async () => {
    const mocks = arrange();
    // Override default mock for this test
    mocks.helpers.mockUseStorageValue.mockReturnValue({
      loading: false,
      value: 'false', // Modal not closed
      setValue: jest.fn(),
      error: null,
    });

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});
    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when notifications are already enabled', async () => {
    const mocks = arrange();
    mocks.selectors.mockIsNotifsEnabled.mockReturnValue(true); // Already enabled

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when basic functionality is disabled', async () => {
    const mocks = arrange();
    mocks.selectors.mockSelectBasicFunctionalityEnabled.mockReturnValue(false); // Basic functionality disabled

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when wallet is locked', async () => {
    const mocks = arrange();
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(false); // Wallet locked

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when feature flag is disabled', async () => {
    const mocks = arrange();
    mocks.selectors.mockGetIsNotificationEnabledByDefaultFeatureFlag.mockReturnValue(
      false,
    ); // Feature flag disabled

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when notifications flag is disabled', async () => {
    const mocks = arrange();
    mocks.helpers.mockIsFlagEnabled.mockReturnValue(false); // Notifications flag disabled

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when user is not signed in', async () => {
    const mocks = arrange();
    mocks.selectors.mockSelectIsSignedIn.mockReturnValue(false); // User not signed in

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('does not enable notifications when user has previously turned off notifications', async () => {
    const mocks = arrange();
    mocks.helpers.mockGetStorageItem.mockResolvedValue(true); // User has turned off notifications

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('handles errors gracefully when hasUserTurnedOffNotificationsOnce fails', async () => {
    const mocks = arrange();
    mocks.helpers.mockGetStorageItem.mockRejectedValueOnce(
      new Error('Storage failed'),
    );

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      // Should not call enable/list notifications when storage check fails
      expect(mocks.hooks.enableNotifications).not.toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).not.toHaveBeenCalled();
    });
  });

  it('handles enableNotifications error gracefully', async () => {
    const mocks = arrange();
    mocks.hooks.enableNotifications.mockRejectedValueOnce(
      new Error('Enable failed'),
    );

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
    });
  });

  it('handles listNotifications error gracefully', async () => {
    const mocks = arrange();
    mocks.hooks.listNotifications.mockRejectedValueOnce(
      new Error('List failed'),
    );

    renderHookWithProvider(() => useEnableNotificationsByDefaultEffect(), {});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });

  it('re-runs effect when dependencies change', async () => {
    const mocks = arrange();
    // Mocking useSelector so it does not memoize the selectors passed in.
    const originalUseSelector = ReactRedux.useSelector;
    jest.spyOn(ReactRedux, 'useSelector').mockImplementation((selector) => {
      // Ensure the selector input is a new reference
      const wrappedSelector = (state: unknown) => selector(state);
      return originalUseSelector(wrappedSelector);
    });

    // First render - conditions not met (wallet locked)
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(false);

    const { rerender } = renderHookWithProvider(
      () => useEnableNotificationsByDefaultEffect(),
      {},
    );

    // Second render - conditions met (notifications disabled and wallet is unlocked)
    mocks.selectors.mockSelectIsUnlocked.mockReturnValue(true);

    rerender({});

    await waitFor(() => {
      expect(mocks.hooks.enableNotifications).toHaveBeenCalled();
      expect(mocks.hooks.listNotifications).toHaveBeenCalled();
    });
  });
});
