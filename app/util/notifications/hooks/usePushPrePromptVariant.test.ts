import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as NotificationSelectors from '../../../selectors/notifications';
// eslint-disable-next-line import-x/no-namespace
import * as KeyringSelectors from '../../../selectors/keyringController';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../selectors/settings';
// eslint-disable-next-line import-x/no-namespace
import * as OnboardingSelectors from '../../../selectors/onboarding';
import { TRUE } from '../../../constants/storage';
import storageWrapper from '../../../store/storage-wrapper';
import { renderHookWithProvider } from '../../test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as Constants from '../constants/config';
import { PUSH_PRE_PROMPT_SHOWN } from '../constants/notification-storage-keys';
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
    },
  },
}));

jest.mock('../utils/push-notification-status', () => ({
  resolvePushNotificationStatus: jest.fn(),
}));

const mockResolvePushNotificationStatus = jest.mocked(
  resolvePushNotificationStatus,
);

const arrangeStorage = (
  values: Partial<Record<string, string | null>> = {},
) => {
  const storageWrapperWithSync = storageWrapper as typeof storageWrapper & {
    getItemSync: (key: string) => string | null;
  };

  if (!storageWrapperWithSync.getItemSync) {
    storageWrapperWithSync.getItemSync = jest.fn();
  }

  jest
    .spyOn(storageWrapperWithSync, 'getItemSync')
    .mockImplementation((key) => {
      if (key in values) {
        return values[key] ?? null;
      }
      return null;
    });
  jest.spyOn(storageWrapper, 'setItem').mockResolvedValue(undefined);
};

const arrangeSelectors = ({
  completedOnboarding = true,
  isPushEnabled = false,
  isFeatureFlagOn = true,
}: {
  completedOnboarding?: boolean;
  isPushEnabled?: boolean;
  isFeatureFlagOn?: boolean;
} = {}) => {
  jest.spyOn(KeyringSelectors, 'selectIsUnlocked').mockReturnValue(true);
  jest
    .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
    .mockReturnValue(true);
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
}: {
  dataCollectionForMarketing?: boolean | null;
} = {}) =>
  renderHookWithProvider(() => usePushPrePromptVariant(), {
    state: {
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
  });

  it('does not return a prompt before onboarding completes', async () => {
    arrangeSelectors({ completedOnboarding: false });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBeNull();
    });
  });

  it('does not return a prompt when local storage says it was shown', async () => {
    arrangeStorage({ [PUSH_PRE_PROMPT_SHOWN]: TRUE });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    expect(storageWrapper.getItemSync).toHaveBeenCalledWith(
      PUSH_PRE_PROMPT_SHOWN,
    );
    expect(storageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('returns the marketing consent prompt when push is enabled and marketing consent is missing', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
  });

  it('returns the push permission prompt when native push permission is disabled', async () => {
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

  it('does not return a prompt when push and marketing consent are enabled', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant({
      dataCollectionForMarketing: true,
    });

    await waitFor(() => {
      expect(result.current.variant).toBeNull();
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
    expect(result.current.variant).toBe('push_permission');

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.variant).toBeNull();
  });
});
