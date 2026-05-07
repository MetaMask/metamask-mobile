import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as NotificationSelectors from '../../../selectors/notifications';
// eslint-disable-next-line import-x/no-namespace
import * as KeyringSelectors from '../../../selectors/keyringController';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../selectors/settings';
// eslint-disable-next-line import-x/no-namespace
import * as OnboardingSelectors from '../../../selectors/onboarding';
import { PUSH_PRE_PROMPT_SHOWN, TRUE } from '../../../constants/storage';
import Engine from '../../../core/Engine';
import storageWrapper from '../../../store/storage-wrapper';
import { renderHookWithProvider } from '../../test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as Constants from '../constants/config';
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

const mockUserStorageController = Engine.context.UserStorageController as {
  performGetStorage: jest.Mock;
  performSetStorage: jest.Mock;
};

const arrangeStorage = (
  values: Partial<Record<string, string | null>> = {},
) => {
  jest.spyOn(storageWrapper, 'getItem').mockImplementation(async (key) => {
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
    mockUserStorageController.performGetStorage.mockResolvedValue(null);
    mockUserStorageController.performSetStorage.mockResolvedValue(undefined);
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

  it('does not return a prompt when user storage says it was shown on a previous install', async () => {
    mockUserStorageController.performGetStorage.mockResolvedValue(TRUE);

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(mockUserStorageController.performGetStorage).toHaveBeenCalledWith(
        'notifications.pushPrePromptShown',
      );
    });

    expect(result.current.variant).toBeNull();
    expect(storageWrapper.setItem).toHaveBeenCalledWith(
      PUSH_PRE_PROMPT_SHOWN,
      TRUE,
    );
  });

  it('returns the marketing consent prompt when push is enabled and marketing consent is missing', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
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
    expect(mockUserStorageController.performSetStorage).toHaveBeenCalledWith(
      'notifications.pushPrePromptShown',
      TRUE,
    );
    expect(result.current.variant).toBe('push_permission');

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.variant).toBeNull();
  });
});
