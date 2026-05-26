import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as NotificationSelectors from '../../../selectors/notifications';
// eslint-disable-next-line import-x/no-namespace
import * as OnboardingSelectors from '../../../selectors/onboarding';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../selectors/settings';
import { setCompletedOnboarding } from '../../../actions/onboarding';
import { PUSH_PRE_PROMPT_SHOWN, TRUE } from '../../../constants/storage';
import storageWrapper from '../../../store/storage-wrapper';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import { isNotificationsFeatureEnabled } from '../constants';
import { resolveNativePushPermissionEnabled } from '../utils/push-notification-status';
import { usePushPrePromptVariant } from './usePushPrePromptVariant';

jest.mock('../utils/push-notification-status', () => ({
  resolveNativePushPermissionEnabled: jest.fn(),
}));

jest.mock('../constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(),
}));

const mockResolveNativePushPermissionEnabled = jest.mocked(
  resolveNativePushPermissionEnabled,
);
const mockIsNotificationsFeatureEnabled = jest.mocked(
  isNotificationsFeatureEnabled,
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
  isFeatureFlagOn = true,
  isBasicFunctionalityEnabled = true,
}: {
  completedOnboarding?: boolean;
  isFeatureFlagOn?: boolean;
  isBasicFunctionalityEnabled?: boolean;
} = {}) => {
  jest
    .spyOn(OnboardingSelectors, 'selectCompletedOnboarding')
    .mockReturnValue(completedOnboarding);
  jest
    .spyOn(
      NotificationSelectors,
      'getIsNotificationEnabledByDefaultFeatureFlag',
    )
    .mockReturnValue(isFeatureFlagOn);
  jest
    .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
    .mockReturnValue(isBasicFunctionalityEnabled);
};

const renderUsePushPrePromptVariant = ({
  completedOnboarding = true,
  hasMarketingConsent = false,
  pendingSocialLoginMarketingConsentBackfill = null,
}: {
  completedOnboarding?: boolean;
  hasMarketingConsent?: boolean;
  pendingSocialLoginMarketingConsentBackfill?: string | null;
} = {}) =>
  renderHookWithProvider(() => usePushPrePromptVariant(), {
    state: {
      onboarding: {
        completedOnboarding,
        pendingSocialLoginMarketingConsentBackfill,
      },
      security: {
        dataCollectionForMarketing: hasMarketingConsent,
      },
    },
  });

describe('usePushPrePromptVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeSelectors();
    arrangeStorage();
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    mockResolveNativePushPermissionEnabled.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the push permission prompt when onboarding is complete and native push is disabled', async () => {
    mockResolveNativePushPermissionEnabled.mockResolvedValue(false);

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(false);
    expect(mockResolveNativePushPermissionEnabled).toHaveBeenCalledTimes(1);
  });

  it('does not return a prompt before onboarding completes', async () => {
    arrangeSelectors({ completedOnboarding: false });

    const { result } = renderUsePushPrePromptVariant({
      completedOnboarding: false,
    });

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();
  });

  it('stays resolving when onboarding completion changes the eligibility inputs', async () => {
    arrangeSelectors({ completedOnboarding: false });
    let resolveNativePushPermission:
      | ((
          value: Awaited<ReturnType<typeof resolveNativePushPermissionEnabled>>,
        ) => void)
      | undefined;
    mockResolveNativePushPermissionEnabled.mockReturnValue(
      new Promise((resolve) => {
        resolveNativePushPermission = resolve;
      }),
    );
    jest
      .spyOn(OnboardingSelectors, 'selectCompletedOnboarding')
      .mockImplementation((state) => state.onboarding.completedOnboarding);

    const { result, store } = renderUsePushPrePromptVariant({
      completedOnboarding: false,
    });

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(setCompletedOnboarding(true));
    });

    expect(result.current.variant).toBeNull();
    expect(result.current.isResolving).toBe(true);

    await act(async () => {
      resolveNativePushPermission?.(false);
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
  });

  it('does not return a prompt when basic functionality is disabled', async () => {
    // When basicFunctionality is off, the prompt gate fails, so native push is
    // never queried and no prompt is shown.
    arrangeSelectors({
      isBasicFunctionalityEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();
  });

  it('does not return a prompt when the default-on feature flag is disabled', async () => {
    arrangeSelectors({ isFeatureFlagOn: false });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();
  });

  it('does not return a prompt when the notifications feature is disabled', async () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();
  });

  it('does not return a prompt when local storage says it was shown', async () => {
    arrangeStorage({ [PUSH_PRE_PROMPT_SHOWN]: TRUE });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();

    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();
    expect(storageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('does not reopen in the same session when shown storage is reset', async () => {
    let storedPrePromptShown: string | null = TRUE;
    jest.spyOn(storageWrapper, 'getItemSync').mockImplementation((key) => {
      if (key === PUSH_PRE_PROMPT_SHOWN) {
        return storedPrePromptShown;
      }
      return null;
    });

    const { result, rerender } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();

    storedPrePromptShown = null;
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolveNativePushPermissionEnabled).not.toHaveBeenCalled();
  });

  it('returns the marketing consent prompt when OS push is enabled and Redux marketing consent is missing', async () => {
    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(true);
    expect(mockResolveNativePushPermissionEnabled).toHaveBeenCalledTimes(1);
  });

  it('does not return a prompt when OS push and Redux marketing consent are enabled', async () => {
    const { result } = renderUsePushPrePromptVariant({
      hasMarketingConsent: true,
    });

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(result.current.nativeOsPermissionEnabled).toBe(true);
  });

  it('defers the marketing consent prompt while social login marketing consent backfill is pending', async () => {
    const { result } = renderUsePushPrePromptVariant({
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(result.current.nativeOsPermissionEnabled).toBe(true);
    expect(mockResolveNativePushPermissionEnabled).toHaveBeenCalledTimes(1);
  });

  it('does not defer the push permission prompt for social login marketing consent backfill', async () => {
    mockResolveNativePushPermissionEnabled.mockResolvedValue(false);
    const { result } = renderUsePushPrePromptVariant({
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(false);
  });

  it('waits for native push permission before showing marketing consent', async () => {
    let resolveNativePushPermission:
      | ((
          value: Awaited<ReturnType<typeof resolveNativePushPermissionEnabled>>,
        ) => void)
      | undefined;
    mockResolveNativePushPermissionEnabled.mockReturnValue(
      new Promise((resolve) => {
        resolveNativePushPermission = resolve;
      }),
    );

    const { result } = renderUsePushPrePromptVariant();

    expect(result.current.variant).toBeNull();
    expect(result.current.isResolving).toBe(true);

    await act(async () => {
      resolveNativePushPermission?.(true);
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
  });

  it('returns null when the native push permission check fails', async () => {
    mockResolveNativePushPermissionEnabled.mockRejectedValue(
      new Error('native permission failed'),
    );

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(result.current.nativeOsPermissionEnabled).toBeNull();
  });

  it('marks the prompt as shown without hiding it until dismissed', async () => {
    mockResolveNativePushPermissionEnabled.mockResolvedValue(false);
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
