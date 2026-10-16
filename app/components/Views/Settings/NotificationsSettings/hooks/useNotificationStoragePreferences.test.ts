import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
import { updateNotificationPreferences } from '../../../../../actions/notification/helpers';
import Logger from '../../../../../util/Logger';
import { useNotificationStoragePreferences } from './useNotificationStoragePreferences';

jest.mock('@metamask/react-data-query');

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../../actions/notification/helpers', () => ({
  updateNotificationPreferences: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';
const REFRESH_SOCIAL_CACHE_ACTION =
  'SocialService:refreshNotificationPreferencesCache';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;
const mockSetQueryData = jest.fn();
const mockGetQueryData = jest.fn();
const mockCancelQueries = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockRefetch = jest.fn();
const mockCall = Engine.controllerMessenger.call as jest.Mock;
const mockUseSelector = useSelector as unknown as jest.Mock;
const mockUpdateNotificationPreferences = jest.mocked(
  updateNotificationPreferences,
);

let queryCache: NotificationPreferences | null | undefined;

type QueryDataUpdater = (
  previousPreferences: NotificationPreferences | null | undefined,
) => NotificationPreferences;

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
  agenticCli: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  priceAlerts: {
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

type QueryResult = ReturnType<typeof useQuery>;

const makeQueryResult = (
  overrides: Partial<
    Omit<QueryResult, 'isLoading'> & { isLoading: boolean }
  > = {},
): QueryResult =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  }) as ReturnType<typeof useQuery>;

describe('useNotificationStoragePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryCache = undefined;
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockUseQueryClient.mockReturnValue({
      setQueryData: mockSetQueryData,
      getQueryData: mockGetQueryData,
      cancelQueries: mockCancelQueries,
      invalidateQueries: mockInvalidateQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    mockSetQueryData.mockImplementation(
      (
        _queryKey: readonly string[],
        updaterOrValue:
          | NotificationPreferences
          | null
          | undefined
          | QueryDataUpdater,
      ) => {
        if (typeof updaterOrValue === 'function') {
          queryCache = (updaterOrValue as QueryDataUpdater)(queryCache);
          return queryCache;
        }

        queryCache = updaterOrValue;
        return queryCache;
      },
    );
    mockGetQueryData.mockImplementation(() => queryCache);
    mockCancelQueries.mockResolvedValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
    mockCall.mockResolvedValue(undefined);
    mockUpdateNotificationPreferences.mockResolvedValue(
      undefined as unknown as NotificationPreferences,
    );
    // Default: aiSocialAusCacheRefreshEnabled flag on. The hook's only
    // useSelector call is for that flag.
    mockUseSelector.mockReturnValue(true);
  });

  it('scopes the query to the active account and exposes query state', () => {
    const preferences = buildPreferences();
    const error = new Error('fetch failed');
    mockUseQuery.mockReturnValue(
      makeQueryResult({ data: preferences, isLoading: true, error }),
    );

    const { result } = renderHook(() => useNotificationStoragePreferences());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [GET_ACTION],
        refetchOnWindowFocus: false,
      }),
    );
    expect(result.current.preferences).toBe(preferences);
    expect(result.current.hasNotificationPreferences).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isUpdatingPreferences).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it('shows the change straight away and sends only the changed field through notification services', async () => {
    queryCache = buildPreferences();
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await act(async () => {
      await result.current.updateSectionChannel(
        'perps',
        'pushNotificationsEnabled',
        false,
      );
    });

    expect(mockCancelQueries).toHaveBeenCalledWith({
      queryKey: [GET_ACTION],
    });
    expect(queryCache?.perps.pushNotificationsEnabled).toBe(false);
    expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
      perps: { pushNotificationsEnabled: false },
    });
    expect(mockCall).not.toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:putNotificationPreferences',
      expect.anything(),
      expect.anything(),
    );
    expect(mockCall).not.toHaveBeenCalledWith(GET_ACTION);
    expect(mockCall).toHaveBeenCalledWith(REFRESH_SOCIAL_CACHE_ACTION);
  });

  it('fires a best-effort Social API cache refresh only after the write succeeds', async () => {
    const initialPreferences = buildPreferences();
    queryCache = initialPreferences;
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));
    const persistError = new Error('network down');
    mockUpdateNotificationPreferences.mockRejectedValue(persistError);

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await act(async () => {
      try {
        await result.current.updateSectionChannel(
          'perps',
          'pushNotificationsEnabled',
          false,
        );
      } catch {
        // expected — the write failed
      }
    });

    // The AUS write failed, so there is nothing to refresh — and crucially no
    // compensating rollback call is made.
    expect(mockCall).not.toHaveBeenCalledWith(REFRESH_SOCIAL_CACHE_ACTION);
  });

  it('does not refresh the Social API cache when the feature flag is disabled', async () => {
    mockUseSelector.mockReturnValue(false);
    queryCache = buildPreferences();
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await act(async () => {
      await result.current.updateSectionChannel(
        'perps',
        'pushNotificationsEnabled',
        false,
      );
    });

    // The AUS write still happens...
    expect(mockUpdateNotificationPreferences).toHaveBeenCalledTimes(1);
    // ...but the gated Social API cache-refresh does not.
    expect(mockCall).not.toHaveBeenCalledWith(REFRESH_SOCIAL_CACHE_ACTION);
  });

  it('accepts a section updater that receives the latest cached section', async () => {
    queryCache = buildPreferences({
      socialAI: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        txAmountLimit: 500,
        mutedTraderProfileIds: ['trader-1'],
      },
    });
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await act(async () => {
      await result.current.updatePreferencesSection('socialAI', (previous) => ({
        ...previous,
        mutedTraderProfileIds: [...previous.mutedTraderProfileIds, 'trader-2'],
      }));
    });

    expect(queryCache?.socialAI.mutedTraderProfileIds).toEqual([
      'trader-1',
      'trader-2',
    ]);
    // Arrays are sent whole: NotificationServicesController replaces them.
    expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
      socialAI: { mutedTraderProfileIds: ['trader-1', 'trader-2'] },
    });
  });

  it('re-reads preferences when an update fails', async () => {
    const initialPreferences = buildPreferences();
    queryCache = initialPreferences;
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));
    const persistError = new Error('network down');
    mockUpdateNotificationPreferences.mockRejectedValue(persistError);
    const { result } = renderHook(() => useNotificationStoragePreferences());
    let thrownError: unknown;

    await act(async () => {
      try {
        await result.current.updateSectionChannel(
          'marketing',
          'inAppNotificationsEnabled',
          true,
        );
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBe(persistError);
    // NotificationServicesController either saves an update or leaves the
    // preferences unchanged, so re-reading shows the stored value.
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: [GET_ACTION],
    });
    expect(Logger.error).toHaveBeenCalledWith(
      persistError,
      'Failed to persist notification preferences',
    );
  });

  it('keeps the latest change when overlapping updates settle out of order', async () => {
    queryCache = buildPreferences();
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));

    let resolveFirst: (saved: NotificationPreferences) => void = () =>
      undefined;
    const firstSaved = new Promise<NotificationPreferences>((resolve) => {
      resolveFirst = resolve;
    });
    const afterFirst = buildPreferences({
      perps: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: false,
      },
    });
    const afterBoth = buildPreferences({
      perps: {
        inAppNotificationsEnabled: false,
        pushNotificationsEnabled: false,
      },
    });
    mockUpdateNotificationPreferences
      .mockReturnValueOnce(firstSaved)
      .mockResolvedValueOnce(afterBoth);

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await act(async () => {
      const first = result.current.updateSectionChannel(
        'perps',
        'pushNotificationsEnabled',
        false,
      );
      const second = result.current.updateSectionChannel(
        'perps',
        'inAppNotificationsEnabled',
        false,
      );
      await second;
      // The first update is still pending, so both changes stay shown.
      expect(queryCache?.perps).toEqual({
        inAppNotificationsEnabled: false,
        pushNotificationsEnabled: false,
      });
      resolveFirst(afterFirst);
      await first;
    });

    expect(mockUpdateNotificationPreferences).toHaveBeenNthCalledWith(1, {
      perps: { pushNotificationsEnabled: false },
    });
    expect(mockUpdateNotificationPreferences).toHaveBeenNthCalledWith(2, {
      perps: { inAppNotificationsEnabled: false },
    });
    expect(queryCache).toEqual(afterBoth);
  });
});
