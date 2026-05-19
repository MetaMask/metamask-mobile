import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as NotificationSelectors from '../../../selectors/notifications';
// eslint-disable-next-line import-x/no-namespace
import * as KeyringSelectors from '../../../selectors/keyringController';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../selectors/settings';
// eslint-disable-next-line import-x/no-namespace
import * as OnboardingSelectors from '../../../selectors/onboarding';
import { setCompletedOnboarding } from '../../../actions/onboarding';
import { PUSH_PRE_PROMPT_SHOWN, TRUE } from '../../../constants/storage';
import Engine from '../../../core/Engine';
import storageWrapper from '../../../store/storage-wrapper';
import { renderHookWithProvider } from '../../test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as Constants from '../constants/config';
import { resolvePushNotificationStatus } from '../utils/push-notification-status';
import { usePushPrePromptVariant } from './usePushPrePromptVariant';

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RemoteFeatureFlagController: {
        state: {
          remoteFeatureFlags: {
            assetsNotificationsEnabled: true,
          },
        },
      },
      UserStorageController: {
        performGetStorage: jest.fn(),
        performSetStorage: jest.fn(),
      },
    },
  },
}));

jest.mock('../utils/push-notification-status', () => ({
  resolvePushNotificationStatus: jest.fn(),
}));

const mockUserStorageController = Engine.context
  .UserStorageController as unknown as {
  performGetStorage: jest.Mock;
  performSetStorage: jest.Mock;
};
const mockResolvePushNotificationStatus = jest.mocked(
  resolvePushNotificationStatus,
);

const arrangeStorage = (
  values: Partial<Record<string, string | null>> = {},
) => {
  jest.spyOn(storageWrapper, 'getItemSync').mockImplementation((key) => {
    if (key in values) {
      return values[key] ?? null;
    }
    return null;
  });
  jest.spyOn(storageWrapper, 'setItem').mockResolvedValue(undefined);
  jest.spyOn(storageWrapper, 'removeItem').mockResolvedValue(undefined);
};

const arrangeSelectors = ({
  completedOnboarding = true,
  isBasicFunctionalityEnabled = true,
  isPushEnabled = false,
  isFeatureFlagOn = true,
}: {
  completedOnboarding?: boolean;
  isBasicFunctionalityEnabled?: boolean;
  isPushEnabled?: boolean;
  isFeatureFlagOn?: boolean;
} = {}) => {
  jest.spyOn(KeyringSelectors, 'selectIsUnlocked').mockReturnValue(true);
  jest
    .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
    .mockReturnValue(isBasicFunctionalityEnabled);
  jest
    .spyOn(OnboardingSelectors, 'selectCompletedOnboarding')
    .mockReturnValue(completedOnboarding);
  jest
    .spyOn(NotificationSelectors, 'selectIsMetaMaskPushNotificationsEnabled')
    .mockReturnValue(isPushEnabled);
  jest
    .spyOn(
      NotificationSelectors,
      'getIsNotificationEnabledByDefaultFeatureFlag',
    )
    .mockReturnValue(isFeatureFlagOn);
  jest.spyOn(Constants, 'isNotificationsFeatureEnabled').mockReturnValue(true);
};

const renderUsePushPrePromptVariant = ({
  dataCollectionForMarketing = false,
  pendingSocialLoginMarketingConsentBackfill = null,
}: {
  dataCollectionForMarketing?: boolean | null;
  pendingSocialLoginMarketingConsentBackfill?: string | null;
} = {}) =>
  renderHookWithProvider(() => usePushPrePromptVariant(), {
    state: {
      onboarding: {
        pendingSocialLoginMarketingConsentBackfill,
      },
      security: {
        dataCollectionForMarketing,
      },
    },
  });

describe('usePushPrePromptVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeSelectors();
    arrangeStorage();
    mockUserStorageController.performGetStorage.mockResolvedValue(null);
    mockUserStorageController.performSetStorage.mockResolvedValue(undefined);
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: true,
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the push permission prompt when onboarding is complete and push is disabled', async () => {
    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
    expect(mockUserStorageController.performGetStorage).not.toHaveBeenCalled();
    expect(mockUserStorageController.performSetStorage).not.toHaveBeenCalled();
  });

  it('does not return a prompt before onboarding completes', async () => {
    arrangeSelectors({ completedOnboarding: false });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBeNull();
    });
  });

  it('stays resolving when onboarding completion changes the eligibility inputs', async () => {
    arrangeSelectors({ completedOnboarding: false, isPushEnabled: true });
    let resolvePushStatus:
      | ((
          value: Awaited<ReturnType<typeof resolvePushNotificationStatus>>,
        ) => void)
      | undefined;
    mockResolvePushNotificationStatus.mockReturnValue(
      new Promise((resolve) => {
        resolvePushStatus = resolve;
      }),
    );
    jest
      .spyOn(OnboardingSelectors, 'selectCompletedOnboarding')
      .mockReturnValue(false);

    const { result, store } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();

    jest
      .spyOn(OnboardingSelectors, 'selectCompletedOnboarding')
      .mockImplementation((state) => state.onboarding.completedOnboarding);

    act(() => {
      store.dispatch(setCompletedOnboarding(true));
    });

    expect(result.current.variant).toBeNull();
    expect(result.current.isResolving).toBe(true);

    await act(async () => {
      resolvePushStatus?.({
        controllerIsPushEnabled: true,
        effectivePushEnabled: false,
        nativeOsPermissionEnabled: false,
      });
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
  });

  it('does not return a prompt when basic functionality is disabled', async () => {
    arrangeSelectors({ isBasicFunctionalityEnabled: false });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBeNull();
    });
    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
  });

  it('does not return a prompt when local storage says it was shown', async () => {
    arrangeStorage({ [PUSH_PRE_PROMPT_SHOWN]: TRUE });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBeNull();
    });

    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
    expect(mockUserStorageController.performGetStorage).not.toHaveBeenCalled();
    expect(mockUserStorageController.performSetStorage).not.toHaveBeenCalled();
    expect(storageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('returns the marketing consent prompt when push is enabled and marketing consent is missing', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
    expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
      controllerIsPushEnabled: true,
    });
  });

  it('does not return a prompt when push and marketing consent are enabled', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant({
      dataCollectionForMarketing: true,
    });

    await waitFor(() => {
      expect(result.current.variant).toBeNull();
    });
  });

  it('returns the push permission prompt when controller push is enabled but OS push permission is disabled', async () => {
    arrangeSelectors({ isPushEnabled: true });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
  });

  it('defers the marketing consent prompt while social login marketing consent backfill is pending', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant({
      dataCollectionForMarketing: false,
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
        controllerIsPushEnabled: true,
      });
    });
    expect(result.current.variant).toBeNull();
  });

  it('does not defer the push permission prompt for social login marketing consent backfill', async () => {
    const { result } = renderUsePushPrePromptVariant({
      dataCollectionForMarketing: false,
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
  });

  it('returns the push permission prompt when native push is disabled even if marketing consent backfill is pending', async () => {
    arrangeSelectors({ isPushEnabled: true });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant({
      dataCollectionForMarketing: false,
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
  });

  it('waits for native push status before showing marketing consent', async () => {
    arrangeSelectors({ isPushEnabled: true });
    let resolvePushStatus:
      | ((
          value: Awaited<ReturnType<typeof resolvePushNotificationStatus>>,
        ) => void)
      | undefined;
    mockResolvePushNotificationStatus.mockReturnValue(
      new Promise((resolve) => {
        resolvePushStatus = resolve;
      }),
    );

    const { result } = renderUsePushPrePromptVariant();

    expect(result.current.variant).toBeNull();

    await act(async () => {
      resolvePushStatus?.({
        controllerIsPushEnabled: true,
        effectivePushEnabled: true,
        nativeOsPermissionEnabled: true,
      });
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
  });

  it('marks the prompt as shown without hiding it until dismissed', async () => {
    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });

    await act(async () => {
      await result.current.markShown();
    });

    expect(storageWrapper.setItem).toHaveBeenCalledWith(
      PUSH_PRE_PROMPT_SHOWN,
      TRUE,
    );
    expect(mockUserStorageController.performSetStorage).not.toHaveBeenCalled();
    expect(result.current.variant).toBe('push_permission');

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.variant).toBeNull();
  });
});
