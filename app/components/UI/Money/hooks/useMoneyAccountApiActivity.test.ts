import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyCardActivityCashbackMultisendContracts } from '../selectors/featureFlags';
import { parseAccountsApiActivity } from '../utils/accountsApi';
import {
  fetchMoneyAccountApiActivityPages,
  MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES,
  useMoneyAccountApiActivity,
} from './useMoneyAccountApiActivity';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import type { AccountsApiActivity } from '../types/moneyActivity';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
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
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
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

function mockQueryResult(overrides: Partial<ReturnType<typeof useQuery>> = {}) {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isInitialLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useQuery>);
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

  it('delegates to useQuery with a multi-page queryFn, select, enabled, staleTime and retry', () => {
    renderHook(() => useMoneyAccountApiActivity());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        ...QUERY_OPTIONS_MOCK,
        queryFn: expect.any(Function),
        select: expect.any(Function),
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
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('maps the query result onto the hook result', () => {
    const refetch = jest.fn();
    mockQueryResult({ data: [CARD], refetch });

    const { result } = renderHook(() => useMoneyAccountApiActivity());

    expect(result.current.activity).toEqual([CARD]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(false);
    result.current.refetch();
    expect(refetch).toHaveBeenCalled();
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

  it('parses the cached response through parseAccountsApiActivity', () => {
    mockParse.mockReturnValue([CARD]);

    renderHook(() => useMoneyAccountApiActivity());
    const { select } = mockUseQuery.mock.calls[0][0] as unknown as {
      select: (response: unknown) => AccountsApiActivity[];
    };
    const parsed = select({ data: ['raw'] });

    expect(mockParse).toHaveBeenCalledWith(
      { data: ['raw'] },
      ADDR_A,
      CASHBACK_MULTISEND_CONTRACTS,
    );
    expect(parsed).toEqual([CARD]);
  });

  it('queryFn fetches up to five pages and merges the rows', async () => {
    mockFetchV1AccountTransactions
      .mockResolvedValueOnce({
        data: [{ hash: '0x1' }] as never,
        pageInfo: { count: 1, hasNextPage: true, cursor: 'cursor-1' },
      })
      .mockResolvedValueOnce({
        data: [{ hash: '0x2' }] as never,
        pageInfo: { count: 1, hasNextPage: true, cursor: 'cursor-2' },
      })
      .mockResolvedValueOnce({
        data: [{ hash: '0x3' }] as never,
        pageInfo: { count: 1, hasNextPage: true, cursor: 'cursor-3' },
      })
      .mockResolvedValueOnce({
        data: [{ hash: '0x4' }] as never,
        pageInfo: { count: 1, hasNextPage: true, cursor: 'cursor-4' },
      })
      .mockResolvedValueOnce({
        data: [{ hash: '0x5' }] as never,
        pageInfo: { count: 1, hasNextPage: true, cursor: 'cursor-5' },
      })
      .mockResolvedValueOnce({
        data: [{ hash: '0x6' }] as never,
        pageInfo: { count: 1, hasNextPage: false },
      });

    renderHook(() => useMoneyAccountApiActivity());
    const { queryFn } = mockUseQuery.mock.calls[0][0] as unknown as {
      queryFn: () => Promise<unknown>;
    };

    const response = await queryFn();

    expect(mockFetchV1AccountTransactions).toHaveBeenCalledTimes(5);
    expect(mockFetchV1AccountTransactions).toHaveBeenNthCalledWith(1, ADDR_A, {
      chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
      sortDirection: 'DESC',
      cursor: undefined,
    });
    expect(mockFetchV1AccountTransactions).toHaveBeenNthCalledWith(5, ADDR_A, {
      chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
      sortDirection: 'DESC',
      cursor: 'cursor-4',
    });
    expect(response).toEqual({
      data: [
        { hash: '0x1' },
        { hash: '0x2' },
        { hash: '0x3' },
        { hash: '0x4' },
        { hash: '0x5' },
      ],
      pageInfo: { count: 1, hasNextPage: true, cursor: 'cursor-5' },
    });
  });
});

describe('fetchMoneyAccountApiActivityPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchV1AccountTransactions.mockReset();
  });

  it('stops after the first page when there is no next page', async () => {
    mockFetchV1AccountTransactions.mockResolvedValue({
      data: [{ hash: '0xonly' }] as never,
      pageInfo: { count: 1, hasNextPage: false },
    });

    const response = await fetchMoneyAccountApiActivityPages(ADDR_A);

    expect(mockFetchV1AccountTransactions).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      data: [{ hash: '0xonly' }],
      pageInfo: { count: 1, hasNextPage: false },
    });
  });

  it(`fetches at most ${MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES} pages`, async () => {
    mockFetchV1AccountTransactions.mockImplementation(
      async (_address, opts) => ({
        data: [{ hash: opts?.cursor ?? 'page-0' }] as never,
        pageInfo: {
          count: 1,
          hasNextPage: true,
          cursor: `next-${opts?.cursor ?? 'page-0'}`,
        },
      }),
    );

    const response = await fetchMoneyAccountApiActivityPages(ADDR_A);

    expect(mockFetchV1AccountTransactions).toHaveBeenCalledTimes(
      MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES,
    );
    expect(response.data).toHaveLength(MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES);
  });
});
