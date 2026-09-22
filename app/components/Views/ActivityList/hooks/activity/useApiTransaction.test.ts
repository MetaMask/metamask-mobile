import { renderHook } from '@testing-library/react-hooks';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { useApiTransaction } from './useApiTransaction';
import { useCachedEvmTransaction } from './useCachedEvmTransaction';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('./useCachedEvmTransaction');
jest.mock('./useTransactionQuery');

const useCachedEvmTransactionMock = jest.mocked(useCachedEvmTransaction);
const useTransactionQueryMock = jest.mocked(useTransactionQuery);

const buildTransaction = (
  overrides: Partial<V1TransactionByHashResponse> = {},
): V1TransactionByHashResponse =>
  ({
    hash: '0xhash',
    timestamp: '2026-05-13T14:34:23.000Z',
    chainId: 1,
    blockNumber: 100,
    blockHash: '0xblock',
    gas: 21000,
    gasUsed: 21000,
    gasPrice: '1000000000',
    effectiveGasPrice: '1000000000',
    nonce: 0,
    cumulativeGasUsed: 21000,
    value: '0',
    to: '0x0000000000000000000000000000000000000002',
    from: '0x0000000000000000000000000000000000000001',
    ...overrides,
  }) as V1TransactionByHashResponse;

describe('useApiTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useTransactionQuery>);
  });

  it('returns the cached transaction without fetching', () => {
    const cached = buildTransaction({ hash: '0xabc' });
    useCachedEvmTransactionMock.mockReturnValue(cached);

    const { result } = renderHook(() =>
      useApiTransaction({
        chainId: 'eip155:1',
        txHash: '0xabc',
      }),
    );

    expect(result.current.transaction).toBe(cached);
    expect(result.current.isFetching).toBe(false);
    expect(useTransactionQueryMock).toHaveBeenCalledWith({
      chainId: 'eip155:1',
      txHash: '0xabc',
      enabled: false,
    });
  });

  it('fetches when the transaction is not cached', () => {
    const fetched = buildTransaction({ hash: '0xdef' });
    useCachedEvmTransactionMock.mockReturnValue(undefined);
    useTransactionQueryMock.mockReturnValue({
      data: fetched,
      isFetching: true,
    } as ReturnType<typeof useTransactionQuery>);

    const { result } = renderHook(() =>
      useApiTransaction({
        chainId: 'eip155:1',
        txHash: '0xdef',
      }),
    );

    expect(result.current.transaction).toBe(fetched);
    expect(result.current.isFetching).toBe(true);
    expect(useTransactionQueryMock).toHaveBeenCalledWith({
      chainId: 'eip155:1',
      txHash: '0xdef',
      enabled: true,
    });
  });
});
