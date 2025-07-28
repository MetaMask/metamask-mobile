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
import { useStartupNotificationsEffect } from './useStartupNotificationsEffect';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('useStartupNotificationsEffect', () => {
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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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

    renderHookWithProvider(() => useStartupNotificationsEffect(), {});

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
      () => useStartupNotificationsEffect(),
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
