import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { parseAccountsApiActivity } from '../utils/accountsApi';
import { useMoneyAccountApiActivity } from './useMoneyAccountApiActivity';
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
const mockParse = jest.mocked(parseAccountsApiActivity);

const ADDR_A = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';
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

  it('delegates to useQuery with select, enabled, staleTime and retry', () => {
    renderHook(() => useMoneyAccountApiActivity());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        ...QUERY_OPTIONS_MOCK,
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

    expect(mockParse).toHaveBeenCalledWith({ data: ['raw'] }, ADDR_A);
    expect(parsed).toEqual([CARD]);
  });
});
