import { renderHook } from '@testing-library/react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyCardActivityCashbackMultisendContracts } from '../selectors/featureFlags';
import { parseAccountsApiActivity } from '../utils/accountsApi';
import { useMoneyAccountApiActivity } from './useMoneyAccountApiActivity';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import type { AccountsApiActivity } from '../types/moneyActivity';

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV1AccountTransactionsQueryOptions: jest.fn(),
      fetchV1AccountTransactions: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));
jest.mock('../utils/accountsApi', () => ({
  parseAccountsApiActivity: jest.fn(),
  oldestRawActivityTime: jest.fn(
    (responses: { data?: { timestamp: string }[] }[]) => {
      const times = responses.flatMap((r) =>
        (r.data ?? []).map((row) => new Date(row.timestamp).getTime()),
      );
      return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
    },
  ),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const mockGetQueryOptions = jest.mocked(
  apiClient.accounts.getV1AccountTransactionsQueryOptions,
);
const mockFetchV1AccountTransactions = jest.mocked(
  apiClient.accounts.fetchV1AccountTransactions,
);
const mockParse = jest.mocked(parseAccountsApiActivity);

const ADDR_A = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';
const CASHBACK_MULTISEND_CONTRACTS = [
  '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb',
];
const QUERY_OPTIONS_MOCK = {
  queryKey: ['accounts', 'transactions', 'v1Account'],
  queryFn: jest.fn(),
};

const CARD: AccountsApiActivity = {
  kind: 'card',
  hash: '0xabc',
  time: 1,
  chainId: '0x8f',
  token: { address: '0xtoken', symbol: 'mUSD', decimals: 6 },
  amount: '5381986',
  paidTo: '0xdef',
};

function setupSelectors(
  opts: {
    account?: { address: string } | undefined;
  } = {},
) {
  // Distinguish "not provided" (default account) from an explicit `undefined`.
  const account = 'account' in opts ? opts.account : { address: ADDR_A };
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return account;
    }
    if (selector === selectMoneyCardActivityCashbackMultisendContracts) {
      return CASHBACK_MULTISEND_CONTRACTS;
    }
    return undefined;
  });
}

function mockQueryResult(
  overrides: Partial<ReturnType<typeof useInfiniteQuery>> = {},
) {
  mockUseInfiniteQuery.mockReturnValue({
    data: undefined,
    isInitialLoading: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: undefined,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useInfiniteQuery>);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupSelectors();
  mockGetQueryOptions.mockReturnValue(
    QUERY_OPTIONS_MOCK as unknown as ReturnType<typeof mockGetQueryOptions>,
  );
  mockQueryResult();
  mockParse.mockReturnValue([]);
});

describe('useMoneyAccountApiActivity', () => {
  it('composes query options from the checksummed money address on Monad', () => {
    renderHook(() => useMoneyAccountApiActivity());

    expect(mockGetQueryOptions).toHaveBeenCalledWith(ADDR_A, {
      chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
      sortDirection: 'DESC',
    });
  });

  it('delegates to useInfiniteQuery reusing the cursor-free query key', () => {
    renderHook(() => useMoneyAccountApiActivity());

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_OPTIONS_MOCK.queryKey,
        queryFn: expect.any(Function),
        getNextPageParam: expect.any(Function),
        enabled: true,
        staleTime: 5 * MINUTE,
        retry: false,
      }),
    );
  });

  it('disables the query and sends an empty address when there is no money account', () => {
    setupSelectors({ account: undefined });

    renderHook(() => useMoneyAccountApiActivity());

    expect(mockGetQueryOptions).toHaveBeenCalledWith('', expect.anything());
    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('queryFn fetches the next page using the cursor pageParam', () => {
    renderHook(() => useMoneyAccountApiActivity());
    const { queryFn } = mockUseInfiniteQuery.mock.calls[0][0] as unknown as {
      queryFn: (ctx: { pageParam?: string }) => unknown;
    };

    queryFn({ pageParam: 'cursor-1' });

    expect(mockFetchV1AccountTransactions).toHaveBeenCalledWith(ADDR_A, {
      chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
      sortDirection: 'DESC',
      cursor: 'cursor-1',
    });
  });

  it('getNextPageParam returns the cursor only while more pages remain', () => {
    renderHook(() => useMoneyAccountApiActivity());
    const { getNextPageParam } = mockUseInfiniteQuery.mock
      .calls[0][0] as unknown as {
      getNextPageParam: (page: unknown) => string | undefined;
    };

    expect(
      getNextPageParam({
        pageInfo: { hasNextPage: true, cursor: 'next' },
      }),
    ).toBe('next');
    expect(
      getNextPageParam({ pageInfo: { hasNextPage: false, cursor: 'next' } }),
    ).toBeUndefined();
  });

  it('getNextPageParam stops on an empty cursor even if hasNextPage is true', () => {
    // react-query only stops on `undefined`; an empty-string cursor would
    // refetch the first page in a loop.
    renderHook(() => useMoneyAccountApiActivity());
    const { getNextPageParam } = mockUseInfiniteQuery.mock
      .calls[0][0] as unknown as {
      getNextPageParam: (page: unknown) => string | undefined;
    };

    expect(
      getNextPageParam({ pageInfo: { hasNextPage: true, cursor: '' } }),
    ).toBeUndefined();
    expect(
      getNextPageParam({ pageInfo: { hasNextPage: true } }),
    ).toBeUndefined();
  });

  it('parses every fetched page through parseAccountsApiActivity and flattens', () => {
    mockParse.mockReturnValueOnce([CARD]).mockReturnValueOnce([]);
    const page1 = { data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] };
    const page2 = { data: [{ timestamp: '2026-06-01T00:00:00.000Z' }] };
    mockQueryResult({
      data: { pages: [page1, page2], pageParams: [] },
      hasNextPage: true,
    });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(mockParse).toHaveBeenNthCalledWith(
      1,
      page1,
      ADDR_A,
      CASHBACK_MULTISEND_CONTRACTS,
    );
    expect(mockParse).toHaveBeenNthCalledWith(
      2,
      page2,
      ADDR_A,
      CASHBACK_MULTISEND_CONTRACTS,
    );
    expect(result.current.activity).toEqual([CARD]);
  });

  it('drops a row repeated across a page boundary (inclusive cursor)', () => {
    const duplicate = { ...CARD };
    mockParse.mockReturnValueOnce([CARD]).mockReturnValueOnce([duplicate]);
    mockQueryResult({
      data: {
        pages: [
          { data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] },
          { data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] },
        ],
        pageParams: [],
      },
      hasNextPage: true,
    });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.activity).toEqual([CARD]);
  });

  it('keeps same-hash rows of different kinds (e.g. a spend and its cashback)', () => {
    const cashback: AccountsApiActivity = {
      kind: 'cashback',
      hash: CARD.hash,
      time: CARD.time,
      chainId: CARD.chainId,
      token: CARD.token,
      amount: CARD.amount,
      receivedFrom: '0xdef',
    };
    mockParse.mockReturnValueOnce([CARD]).mockReturnValueOnce([cashback]);
    mockQueryResult({
      data: {
        pages: [
          { data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] },
          { data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] },
        ],
        pageParams: [],
      },
      hasNextPage: true,
    });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.activity).toEqual([CARD, cashback]);
  });

  it('reports the oldest fetched raw time as the watermark while more pages remain', () => {
    mockQueryResult({
      data: {
        pages: [
          { data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] },
          { data: [{ timestamp: '2026-06-01T00:00:00.000Z' }] },
        ],
        pageParams: [],
      },
      hasNextPage: true,
    });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.watermark).toBe(
      new Date('2026-06-01T00:00:00.000Z').getTime(),
    );
    expect(result.current.isComplete).toBe(false);
    expect(result.current.hasMore).toBe(true);
  });

  it('drops the watermark to -Infinity and marks complete once exhausted', () => {
    mockQueryResult({
      data: {
        pages: [{ data: [{ timestamp: '2026-06-04T00:00:00.000Z' }] }],
        pageParams: [],
      },
      hasNextPage: false,
    });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.watermark).toBe(Number.NEGATIVE_INFINITY);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMore fetches the next page only when one remains and none is in flight', () => {
    const fetchNextPage = jest.fn();
    mockQueryResult({ hasNextPage: true, fetchNextPage });

    const { result } = renderHook(() => useMoneyAccountApiActivity());
    result.current.loadMore();

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('loadMore is inert while a page is already being fetched', () => {
    const fetchNextPage = jest.fn();
    mockQueryResult({
      hasNextPage: true,
      isFetchingNextPage: true,
      fetchNextPage,
    });

    const { result } = renderHook(() => useMoneyAccountApiActivity());
    result.current.loadMore();

    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(result.current.isLoadingMore).toBe(true);
  });

  it('reports loading only on the initial fetch and shows no rows', () => {
    mockQueryResult({ isInitialLoading: true });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activity).toEqual([]);
  });

  it('surfaces an error and shows no rows when the query fails', () => {
    mockQueryResult({ isError: true });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.error).toBe(true);
    expect(result.current.activity).toEqual([]);
  });

  it('treats a failed fetch as a terminal (complete) state so rows are not withheld', () => {
    // `retry: false` means an errored query never recovers and `hasNextPage`
    // stays `undefined`. Reporting it complete with a `-Infinity` watermark lets
    // the consumer stop gating local rows and drop its skeleton.
    mockQueryResult({ isError: true });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.watermark).toBe(Number.NEGATIVE_INFINITY);
    expect(result.current.hasMore).toBe(false);
  });

  it('stops pagination after a mid-scroll error even though a next page was pending', () => {
    // After a failed `fetchNextPage`, `hasNextPage` (derived from the last
    // *successful* page) stays true. Without the error guard every pagination
    // driver would re-issue the failed request in a loop.
    const fetchNextPage = jest.fn();
    mockQueryResult({ isError: true, hasNextPage: true, fetchNextPage });

    const { result } = renderHook(() => useMoneyAccountApiActivity());
    result.current.loadMore();

    expect(result.current.hasMore).toBe(false);
    expect(result.current.isComplete).toBe(true);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('treats a disabled query (no money account) as a terminal (complete) state', () => {
    setupSelectors({ account: undefined });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.watermark).toBe(Number.NEGATIVE_INFINITY);
    expect(result.current.hasMore).toBe(false);
  });

  it('exposes refetch from the query', () => {
    const refetch = jest.fn();
    mockQueryResult({ refetch });

    const { result } = renderHook(() => useMoneyAccountApiActivity());
    result.current.refetch();

    expect(refetch).toHaveBeenCalled();
  });
});
