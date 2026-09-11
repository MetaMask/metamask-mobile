import { renderHook } from '@testing-library/react-hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../core/apiClient';
import { useTransactionsQuery } from './useTransactionsQuery';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn((options) => options),
}));

jest.mock('../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV4MultiAccountTransactionsInfiniteQueryOptions: jest.fn(() => ({
        queryKey: ['transactions'],
        queryFn: jest.fn(),
      })),
    },
  },
}));

jest.mock('./helpers/transformations', () => ({
  selectApiEvmTransactions: jest.fn((args) => ({ selectorArgs: args })),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;

describe('useTransactionsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the selected account-group EVM address and configured networks', () => {
    const excludedTxHashes = new Set(['0xskip']);
    mockUseSelector
      .mockReturnValueOnce({ address: '0xGroupAddress' })
      .mockReturnValueOnce('0xGlobalAddress')
      .mockReturnValueOnce(['eip155:1'])
      .mockReturnValueOnce(excludedTxHashes);

    renderHook(() => useTransactionsQuery());

    expect(
      apiClient.accounts.getV4MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountAddresses: ['eip155:0:0xGroupAddress'],
      networks: ['eip155:1'],
      includeTxMetadata: true,
    });
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        retry: false,
        select: {
          selectorArgs: {
            address: '0xGroupAddress',
            excludedTxHashes,
          },
        },
      }),
    );
  });

  it('falls back to the global EVM address and disables the query without networks', () => {
    mockUseSelector
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('0xGlobalAddress')
      .mockReturnValueOnce([])
      .mockReturnValueOnce(new Set());

    renderHook(() => useTransactionsQuery());

    expect(
      apiClient.accounts.getV4MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountAddresses: ['eip155:0:0xGlobalAddress'],
      networks: [],
      includeTxMetadata: true,
    });
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('does not request account addresses when no EVM address exists', () => {
    mockUseSelector
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['eip155:1'])
      .mockReturnValueOnce(new Set());

    renderHook(() => useTransactionsQuery());

    expect(
      apiClient.accounts.getV4MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountAddresses: [],
      networks: ['eip155:1'],
      includeTxMetadata: true,
    });
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
