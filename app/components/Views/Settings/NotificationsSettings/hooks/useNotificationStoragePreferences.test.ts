import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
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

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountId: jest.fn(),
}));

const MOCK_ACCOUNT_ID = 'account-1';
const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';
const PUT_ACTION = 'AuthenticatedUserStorageService:putNotificationPreferences';
const CLIENT_TYPE = 'mobile';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSetQueryData = jest.fn();
const mockRefetch = jest.fn();
const mockCall = Engine.controllerMessenger.call as jest.Mock;

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
  overrides: Partial<Omit<QueryResult, 'isLoading'> & { isLoading: boolean }> = {},
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
    mockUseSelector.mockReturnValue(MOCK_ACCOUNT_ID);
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockUseQueryClient.mockReturnValue({
      setQueryData: mockSetQueryData,
    } as unknown as ReturnType<typeof useQueryClient>);
    mockCall.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
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
        queryKey: [GET_ACTION, MOCK_ACCOUNT_ID],
      }),
    );
    expect(result.current.preferences).toBe(preferences);
    expect(result.current.hasNotificationPreferences).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(error);
  });

  it('persists an updated channel key with a read-merge-write payload', async () => {
    const cachedPreferences = buildPreferences();
    const latestPreferences = buildPreferences({
      walletActivity: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        accounts: [{ address: '0xabc', enabled: true }],
      },
      marketing: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      },
    });
    mockUseQuery.mockReturnValue(makeQueryResult({ data: cachedPreferences }));
    mockCall.mockImplementation(async (action: string) => {
      if (action === GET_ACTION) {
        return latestPreferences;
      }
      return undefined;
    });

    const { result } = renderHook(() => useNotificationStoragePreferences());

    await act(async () => {
      await result.current.updatePreference(
        'perps',
        'pushNotificationsEnabled',
        false,
      );
    });

    const [queryKey, updater] = mockSetQueryData.mock.calls[0];
    expect(queryKey).toEqual([GET_ACTION, MOCK_ACCOUNT_ID]);
    expect((updater as QueryDataUpdater)(latestPreferences)).toEqual({
      ...latestPreferences,
      perps: {
        ...cachedPreferences.perps,
        pushNotificationsEnabled: false,
      },
    });
    expect(mockCall).toHaveBeenCalledWith(GET_ACTION);
    expect(mockCall).toHaveBeenCalledWith(
      PUT_ACTION,
      {
        ...latestPreferences,
        perps: {
          ...cachedPreferences.perps,
          pushNotificationsEnabled: false,
        },
      },
      CLIENT_TYPE,
    );
  });

  it('refetches and rethrows when persistence fails', async () => {
    const persistError = new Error('network down');
    mockUseQuery.mockReturnValue(makeQueryResult({ data: buildPreferences() }));
    mockCall.mockImplementation(async (action: string) => {
      if (action === GET_ACTION) {
        return buildPreferences();
      }
      if (action === PUT_ACTION) {
        throw persistError;
      }
      return undefined;
    });
    const { result } = renderHook(() => useNotificationStoragePreferences());
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
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      persistError,
      'Failed to persist notification preferences',
    );
  });
});
