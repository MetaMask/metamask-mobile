import { renderHook } from '@testing-library/react-hooks';
import type { V5TransactionRecord } from '@metamask/core-backend';
import { buildV5TransactionRecord } from '#app/util/test/v5TransactionFixtures';
import { useApiTransaction } from './useApiTransaction';
import { useCachedEvmTransaction } from './useCachedEvmTransaction';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('./useCachedEvmTransaction');
jest.mock('./useTransactionQuery');

const useCachedEvmTransactionMock = jest.mocked(useCachedEvmTransaction);
const useTransactionQueryMock = jest.mocked(useTransactionQuery);

const buildV5CachedTransaction = (
  overrides: Partial<V5TransactionRecord['tx']> = {},
): V5TransactionRecord =>
  buildV5TransactionRecord({
    accountId: 'eip155:1:0x0000000000000000000000000000000000000001',
    ...overrides,
  });

describe('useApiTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useTransactionQuery>);
  });

  it('returns the cached transaction without fetching', () => {
    const cached = buildV5CachedTransaction({ id: '0xabc' });
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
    const fetched = buildV5CachedTransaction({ id: '0xdef' });
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
