import { act, renderHook } from '@testing-library/react-native';
import type { NotificationStoragePreferences } from './useNotificationStoragePreferences';
import { useNotificationsMarketingConsent } from './useNotificationsMarketingConsent';

const mockUpdatePreferencesSection = jest.fn();
const mockUseNotificationStoragePreferences = jest.fn();
const mockUseNotificationsRuntimeGate = jest.fn().mockReturnValue(true);

jest.mock('./useNotificationStoragePreferences', () => ({
  useNotificationStoragePreferences: (args: { enabled?: boolean } = {}) =>
    mockUseNotificationStoragePreferences(args),
}));

jest.mock('./useNotificationsRuntimeGate', () => ({
  useNotificationsRuntimeGate: () => mockUseNotificationsRuntimeGate(),
}));

const buildNotificationPreferences = (
  overrides: Partial<NotificationStoragePreferences> = {},
): NotificationStoragePreferences => ({
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

describe('useNotificationsMarketingConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationsRuntimeGate.mockReturnValue(true);
    mockUseNotificationStoragePreferences.mockReturnValue({
      error: null,
      hasNotificationPreferences: true,
      isLoading: false,
      preferences: buildNotificationPreferences(),
      updatePreferencesSection: mockUpdatePreferencesSection,
    });
  });

  it('returns true when marketing push and in-app preferences are enabled', () => {
    mockUseNotificationStoragePreferences.mockReturnValue({
      error: null,
      hasNotificationPreferences: true,
      isLoading: false,
      preferences: buildNotificationPreferences({
        marketing: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
      }),
      updatePreferencesSection: mockUpdatePreferencesSection,
    });

    const { result } = renderHook(() => useNotificationsMarketingConsent());

    expect(result.current.marketingNotificationsEnabled).toBe(true);
  });

  it('returns false when either marketing notification channel is disabled', () => {
    const { result } = renderHook(() => useNotificationsMarketingConsent());

    expect(result.current.marketingNotificationsEnabled).toBe(false);
  });

  it('updates both marketing notification channels while preserving the section shape', async () => {
    const { result } = renderHook(() => useNotificationsMarketingConsent());

    await act(async () => {
      await result.current.setMarketingNotificationsEnabled(true);
    });

    const [, updateMarketingPreferences] =
      mockUpdatePreferencesSection.mock.calls[0];

    expect(mockUpdatePreferencesSection).toHaveBeenCalledWith(
      'marketing',
      expect.any(Function),
    );
    expect(
      updateMarketingPreferences({
        inAppNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      }),
    ).toEqual({
      inAppNotificationsEnabled: true,
      pushNotificationsEnabled: true,
    });
  });

  it('requests a marketing update even when cached notification preferences are missing', async () => {
    mockUseNotificationStoragePreferences.mockReturnValue({
      error: null,
      hasNotificationPreferences: false,
      isLoading: false,
      preferences: null,
      updatePreferencesSection: mockUpdatePreferencesSection,
    });

    const { result } = renderHook(() => useNotificationsMarketingConsent());

    await act(async () => {
      await result.current.setMarketingNotificationsEnabled(true);
    });

    expect(mockUpdatePreferencesSection).toHaveBeenCalledWith(
      'marketing',
      expect.any(Function),
    );
  });

  it('disables the query when the runtime gate is false and no override is provided', () => {
    mockUseNotificationsRuntimeGate.mockReturnValue(false);

    let capturedEnabled: boolean | undefined;
    mockUseNotificationStoragePreferences.mockImplementation(
      ({ enabled }: { enabled?: boolean } = {}) => {
        capturedEnabled = enabled;
        return {
          error: null,
          hasNotificationPreferences: false,
          isLoading: false,
          preferences: null,
          updatePreferencesSection: mockUpdatePreferencesSection,
        };
      },
    );

    renderHook(() => useNotificationsMarketingConsent());

    expect(capturedEnabled).toBe(false);
  });

  it('overrides the gate when enabled is explicitly set to true', () => {
    mockUseNotificationsRuntimeGate.mockReturnValue(false);

    let capturedEnabled: boolean | undefined;
    mockUseNotificationStoragePreferences.mockImplementation(
      ({ enabled }: { enabled?: boolean } = {}) => {
        capturedEnabled = enabled;
        return {
          error: null,
          hasNotificationPreferences: true,
          isLoading: false,
          preferences: buildNotificationPreferences(),
          updatePreferencesSection: mockUpdatePreferencesSection,
        };
      },
    );

    renderHook(() => useNotificationsMarketingConsent({ enabled: true }));

    expect(capturedEnabled).toBe(true);
  });
});
