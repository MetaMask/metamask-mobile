import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
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

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';
const PUT_ACTION = 'AuthenticatedUserStorageService:putNotificationPreferences';
const CLIENT_TYPE = 'mobile';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;
const mockSetQueryData = jest.fn();
const mockGetQueryData = jest.fn();
const mockCancelQueries = jest.fn();
const mockRefetch = jest.fn();
const mockCall = Engine.controllerMessenger.call as jest.Mock;

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
    mockRefetch.mockResolvedValue(undefined);
    mockCall.mockResolvedValue(undefined);
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

  it('optimistically updates cache and PUTs latest cached preferences', async () => {
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
    expect(mockCall).toHaveBeenCalledWith(
      PUT_ACTION,
      expect.objectContaining({
        perps: expect.objectContaining({
          pushNotificationsEnabled: false,
        }),
      }),
      CLIENT_TYPE,
    );
    expect(mockCall).not.toHaveBeenCalledWith(GET_ACTION);
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
    expect(mockCall).toHaveBeenCalledWith(
      PUT_ACTION,
      expect.objectContaining({
        socialAI: expect.objectContaining({
          mutedTraderProfileIds: ['trader-1', 'trader-2'],
        }),
      }),
      CLIENT_TYPE,
    );
  });

  it('rolls back cache when latest write fails', async () => {
    const initialPreferences = buildPreferences();
    queryCache = initialPreferences;
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));
    const persistError = new Error('network down');
    mockCall.mockImplementation(async (action: string) => {
      if (action === PUT_ACTION) {
        throw persistError;
      }
      return undefined;
    });
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
    expect(queryCache).toEqual(initialPreferences);
    expect(Logger.error).toHaveBeenCalledWith(
      persistError,
      'Failed to persist notification preferences',
    );
  });

  it('serializes overlapping writes and preserves the latest preference intent', async () => {
    queryCache = buildPreferences();
    mockUseQuery.mockReturnValue(makeQueryResult({ data: queryCache }));

    let resolveFirstPut: () => void = () => undefined;
    const firstPut = new Promise<void>((resolve) => {
      resolveFirstPut = resolve;
    });
    const putPayloads: NotificationPreferences[] = [];
    let putCount = 0;
    mockCall.mockImplementation(async (action: string, payload: unknown) => {
      if (action !== PUT_ACTION) {
        return undefined;
      }

      putCount += 1;
      putPayloads.push(payload as NotificationPreferences);
      if (putCount === 1) {
        await firstPut;
      }
      return undefined;
    });

    const { result } = renderHook(() => useNotificationStoragePreferences());

    let firstWrite: Promise<void> | undefined;
    let secondWrite: Promise<void> | undefined;
    await act(async () => {
      firstWrite = result.current.updateSectionChannel(
        'walletActivity',
        'pushNotificationsEnabled',
        false,
      );
      secondWrite = result.current.updateSectionChannel(
        'walletActivity',
        'pushNotificationsEnabled',
        true,
      );
      resolveFirstPut();
      await Promise.all([firstWrite, secondWrite]);
    });

    expect(putPayloads).toHaveLength(2);
    expect(putPayloads[0].walletActivity.pushNotificationsEnabled).toBe(false);
    expect(putPayloads[1].walletActivity.pushNotificationsEnabled).toBe(true);
    expect(queryCache?.walletActivity.pushNotificationsEnabled).toBe(true);
  });
});
