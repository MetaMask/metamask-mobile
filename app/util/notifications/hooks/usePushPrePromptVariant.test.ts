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
import { resolvePushNotificationStatus } from '../utils/push-notification-status';
import { usePushPrePromptVariant } from './usePushPrePromptVariant';

const mockUseNotificationsMarketingConsent = jest.fn();
const mockUseNotificationsRuntimeGate = jest.fn().mockReturnValue(true);

jest.mock('../utils/push-notification-status', () => ({
  resolvePushNotificationStatus: jest.fn(),
}));

jest.mock('./useNotificationsMarketingConsent', () => ({
  useNotificationsMarketingConsent: (opts: { enabled?: boolean }) =>
    mockUseNotificationsMarketingConsent(opts),
}));

jest.mock('./useNotificationsRuntimeGate', () => ({
  useNotificationsRuntimeGate: () => mockUseNotificationsRuntimeGate(),
}));

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
  isPushEnabled = false,
  isFeatureFlagOn = true,
  isBasicFunctionalityEnabled = true,
  runtimeGate = true,
}: {
  completedOnboarding?: boolean;
  isPushEnabled?: boolean;
  isFeatureFlagOn?: boolean;
  isBasicFunctionalityEnabled?: boolean;
  runtimeGate?: boolean;
} = {}) => {
  mockUseNotificationsRuntimeGate.mockReturnValue(runtimeGate);
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
  jest
    .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
    .mockReturnValue(isBasicFunctionalityEnabled);
};

const renderUsePushPrePromptVariant = ({
  pendingSocialLoginMarketingConsentBackfill = null,
}: {
  pendingSocialLoginMarketingConsentBackfill?: string | null;
} = {}) =>
  renderHookWithProvider(() => usePushPrePromptVariant(), {
    state: {
      onboarding: {
        pendingSocialLoginMarketingConsentBackfill,
      },
    },
  });

describe('usePushPrePromptVariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeSelectors();
    arrangeStorage();
    mockUseNotificationsMarketingConsent.mockReturnValue({
      hasNotificationPreferences: true,
      isLoading: false,
      marketingNotificationsEnabled: false,
    });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: true,
      effectivePushEnabled: true,
      nativeOsPermissionEnabled: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns push_permission when the runtime gate is false but OS push is disabled', async () => {
    // runtimeGate=false (not yet signed in) should NOT block the push-permission
    // fast path. Only isBasicFunctionalityEnabled, completedOnboarding and the
    // feature flag are required for that lighter gate.
    arrangeSelectors({ runtimeGate: false });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(false);
  });

  it('returns null when the runtime gate is false and OS push is already enabled', async () => {
    // OS push already granted + not signed in → marketing-consent path is
    // gated on the full runtime gate, so nothing is shown yet.
    arrangeSelectors({ runtimeGate: false });
    // Default mock has nativeOsPermissionEnabled: true

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    // FCM IS checked (push-permission gate is active); only the
    // marketing-consent branch is skipped.
    expect(mockResolvePushNotificationStatus).toHaveBeenCalled();
  });

  it('returns the push permission prompt when onboarding is complete and push is disabled', async () => {
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(false);
    expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
      controllerIsPushEnabled: false,
    });
  });

  it('does not return a prompt before onboarding completes', async () => {
    arrangeSelectors({ completedOnboarding: false });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
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
    // When basicFunctionality is off the lightweight push-permission gate also
    // fails, so FCM is never queried and no prompt is shown.
    arrangeSelectors({
      runtimeGate: false,
      isBasicFunctionalityEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
  });

  it('does not query marketing consent preferences on the push-permission fast path', async () => {
    // When runtimeGate=false (not yet signed in) and OS push is disabled, the
    // hook should resolve to push_permission without enabling the user-storage
    // query for notification preferences (which needs authentication).
    arrangeSelectors({ runtimeGate: false });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    // useNotificationsMarketingConsent must have been called with enabled:false
    // so the underlying user-storage query is never initiated.
    expect(mockUseNotificationsMarketingConsent).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseNotificationsMarketingConsent).not.toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('does not return a prompt when local storage says it was shown', async () => {
    arrangeStorage({ [PUSH_PRE_PROMPT_SHOWN]: TRUE });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();

    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
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
    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();

    storedPrePromptShown = null;
    rerender(undefined);

    expect(result.current.variant).toBeNull();
    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
  });

  it('returns the marketing consent prompt when push is enabled and marketing consent is missing', async () => {
    arrangeSelectors({ isPushEnabled: true });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(true);
    expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
      controllerIsPushEnabled: true,
    });
  });

  it('does not return a prompt when push and marketing notifications are enabled', async () => {
    arrangeSelectors({ isPushEnabled: true });
    mockUseNotificationsMarketingConsent.mockReturnValue({
      hasNotificationPreferences: true,
      isLoading: false,
      marketingNotificationsEnabled: true,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
  });

  it('returns the marketing consent prompt when OS push is enabled but controller push is disabled', async () => {
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: true,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('marketing_consent');
    });
    expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
      controllerIsPushEnabled: false,
    });
  });

  it('returns the push permission prompt when OS push is enabled but notification preferences are missing', async () => {
    mockUseNotificationsMarketingConsent.mockReturnValue({
      hasNotificationPreferences: false,
      isLoading: false,
      marketingNotificationsEnabled: false,
    });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: true,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(true);
    expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
      controllerIsPushEnabled: false,
    });
  });

  it('stays resolving while notification preferences are loading', async () => {
    mockUseNotificationsMarketingConsent.mockReturnValue({
      hasNotificationPreferences: false,
      isLoading: true,
      marketingNotificationsEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    expect(result.current.isResolving).toBe(true);
    expect(result.current.variant).toBeNull();
    await waitFor(() => {
      expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
        controllerIsPushEnabled: false,
      });
    });
  });

  it('does not wait for notification preferences when OS push permission is disabled', async () => {
    mockUseNotificationsMarketingConsent.mockReturnValue({
      hasNotificationPreferences: false,
      isLoading: true,
      marketingNotificationsEnabled: false,
    });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant();

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(result.current.nativeOsPermissionEnabled).toBe(false);
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
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
        controllerIsPushEnabled: true,
      });
    });
    await waitFor(() => {
      expect(result.current.isResolving).toBe(false);
    });
    expect(result.current.variant).toBeNull();
  });

  it('does not defer the push permission prompt for social login marketing consent backfill', async () => {
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });
    const { result } = renderUsePushPrePromptVariant({
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });

    await waitFor(() => {
      expect(result.current.variant).toBe('push_permission');
    });
    expect(mockResolvePushNotificationStatus).toHaveBeenCalledWith({
      controllerIsPushEnabled: false,
    });
  });

  it('returns the push permission prompt when native push is disabled even if marketing consent backfill is pending', async () => {
    arrangeSelectors({ isPushEnabled: true });
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    const { result } = renderUsePushPrePromptVariant({
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
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: false,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });
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
