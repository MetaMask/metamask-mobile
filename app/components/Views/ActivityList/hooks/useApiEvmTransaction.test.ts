import { renderHook } from '@testing-library/react-hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../core/apiClient';
import {
  findApiEvmTransactionByHash,
  useApiEvmTransaction,
} from './useApiEvmTransaction';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn((options) => ({
    data:
      options.enabled && options.select
        ? options.select({
            pages: [
              {
                data: [
                  { hash: '0xAAA', transactionProtocol: 'CURVE' },
                  { hash: '0xbbb', transactionProtocol: 'ACROSS' },
                ],
              },
            ],
            pageParams: [],
          })
        : undefined,
  })),
}));

jest.mock('../../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV4MultiAccountTransactionsInfiniteQueryOptions: jest.fn(() => ({
        queryKey: ['transactions'],
        queryFn: jest.fn(),
      })),
    },
  },
}));

const mockUseSelector = useSelector as unknown as jest.Mock;

describe('findApiEvmTransactionByHash', () => {
  const data = {
    pages: [
      {
        data: [
          { hash: '0xAAA', transactionProtocol: 'CURVE' },
          { hash: '0xbbb', transactionProtocol: 'ACROSS' },
        ],
      },
    ],
    pageParams: [],
  };

  it('finds a transaction by hash case-insensitively', () => {
    expect(findApiEvmTransactionByHash(data, '0xaaa')).toEqual({
      hash: '0xAAA',
      transactionProtocol: 'CURVE',
    });
  });

  it('returns undefined when the hash is missing or unknown', () => {
    expect(findApiEvmTransactionByHash(data, undefined)).toBeUndefined();
    expect(findApiEvmTransactionByHash(data, '0xmissing')).toBeUndefined();
    expect(findApiEvmTransactionByHash(undefined, '0xaaa')).toBeUndefined();
  });
});

describe('useApiEvmTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector
      .mockReturnValueOnce({ address: '0xGroupAddress' })
      .mockReturnValueOnce('0xGlobalAddress')
      .mockReturnValueOnce(['eip155:1']);
  });

  it('returns the unmapped API transaction for the given hash', () => {
    const { result } = renderHook(() => useApiEvmTransaction('0xaaa'));

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
      }),
    );
    expect(result.current).toEqual({
      hash: '0xAAA',
      transactionProtocol: 'CURVE',
    });
  });

  it('disables the query when no hash is provided', () => {
    const { result } = renderHook(() => useApiEvmTransaction());

    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(result.current).toBeUndefined();
  });
});
