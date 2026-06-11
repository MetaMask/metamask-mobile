import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import { DEFAULT_AGENTIC_CLI_PREFERENCES } from '@metamask/notification-services-controller';
import { useNotificationStoragePreferences } from './useNotificationStoragePreferences';

const mockGetQueryData = jest.fn();
const mockSetQueryData = jest.fn();
const mockCacheUnsubscribe = jest.fn();
const mockCacheSubscribe = jest.fn(() => mockCacheUnsubscribe);

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock(
  '../../../../../util/notifications/ensureAgenticCliNotificationPreferencesMigrated',
  () => ({
    ensureNotificationPreferencesReady: jest.fn().mockResolvedValue(undefined),
    mergeAndPersistNotificationPreferences: jest.fn(),
    readNotificationPreferencesForUpdate: jest.fn(),
  }),
);

const {
  mergeAndPersistNotificationPreferences,
  readNotificationPreferencesForUpdate,
} = jest.requireMock(
  '../../../../../util/notifications/ensureAgenticCliNotificationPreferencesMigrated',
) as {
  mergeAndPersistNotificationPreferences: jest.Mock;
  readNotificationPreferencesForUpdate: jest.Mock;
};

const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;

const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';

const buildPreferences = (
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
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
  agenticCli: DEFAULT_AGENTIC_CLI_PREFERENCES,
  ...overrides,
});

describe('useNotificationStoragePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetQueryData.mockReturnValue(undefined);
    mockUseQueryClient.mockReturnValue({
      getQueryData: mockGetQueryData,
      setQueryData: mockSetQueryData,
      getQueryCache: () => ({
        subscribe: mockCacheSubscribe,
      }),
    } as unknown as ReturnType<typeof useQueryClient>);
  });

  it('loads cached preferences and exposes hook state', async () => {
    const preferences = buildPreferences();
    mockGetQueryData.mockReturnValue(preferences);

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(preferences);
    expect(result.current.hasNotificationPreferences).toBe(true);
    expect(mergeAndPersistNotificationPreferences).not.toHaveBeenCalled();
  });

  it('persists an updated channel key with a read-merge-write payload', async () => {
    const cachedPreferences = buildPreferences();
    mockGetQueryData.mockReturnValue(cachedPreferences);
    mergeAndPersistNotificationPreferences.mockResolvedValue(
      buildPreferences({
        perps: {
          ...cachedPreferences.perps,
          pushNotificationsEnabled: false,
        },
      }),
    );

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await waitFor(() => {
      expect(result.current.preferences).toEqual(cachedPreferences);
    });

    await act(async () => {
      await result.current.updatePreference(
        'perps',
        'pushNotificationsEnabled',
        false,
      );
    });

    expect(mergeAndPersistNotificationPreferences).toHaveBeenCalledWith({
      perps: {
        ...cachedPreferences.perps,
        pushNotificationsEnabled: false,
      },
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      [GET_ACTION],
      expect.objectContaining({
        perps: {
          ...cachedPreferences.perps,
          pushNotificationsEnabled: false,
        },
      }),
    );
  });

  it('restores preferences and rethrows when persistence fails', async () => {
    const cachedPreferences = buildPreferences();
    const restoredPreferences = buildPreferences({
      marketing: {
        inAppNotificationsEnabled: false,
        pushNotificationsEnabled: false,
      },
    });
    const persistError = new Error('network down');

    mockGetQueryData.mockReturnValue(cachedPreferences);
    mergeAndPersistNotificationPreferences.mockRejectedValue(persistError);
    readNotificationPreferencesForUpdate.mockResolvedValue(restoredPreferences);

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await waitFor(() => {
      expect(result.current.preferences).toEqual(cachedPreferences);
    });

    let thrownError: unknown;

    await act(async () => {
      try {
        await result.current.updatePreference(
          'marketing',
          'inAppNotificationsEnabled',
          true,
        );
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBe(persistError);
    expect(readNotificationPreferencesForUpdate).toHaveBeenCalled();
    expect(result.current.preferences).toEqual(restoredPreferences);
  });
});
