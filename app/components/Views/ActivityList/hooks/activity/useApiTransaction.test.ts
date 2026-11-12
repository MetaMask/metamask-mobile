import { renderHook } from '@testing-library/react-hooks';
import type { V5TransactionRecord } from '@metamask/core-backend';
import type { CaipAccountId, CaipChainId } from '@metamask/utils';
import { useApiTransaction } from './useApiTransaction';
import { useCachedEvmTransaction } from './useCachedEvmTransaction';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('./useCachedEvmTransaction');
jest.mock('./useTransactionQuery');

const useCachedEvmTransactionMock = jest.mocked(useCachedEvmTransaction);
const useTransactionQueryMock = jest.mocked(useTransactionQuery);

const buildV5Transaction = (
  overrides: Partial<V5TransactionRecord['tx']> = {},
): V5TransactionRecord => ({
  accountId:
    'eip155:1:0x0000000000000000000000000000000000000001' as CaipAccountId,
  tx: {
    id: '0xhash',
    chainId: 'eip155:1' as CaipChainId,
    status: 'confirmed',
    timestamp: 1778593067000,
    date: '2026-05-13T14:34:23.000Z',
    from: '0x0000000000000000000000000000000000000001',
    to: '0x0000000000000000000000000000000000000002',
    blockNumber: '1',
    blockHash: '0xblock',
    value: '0',
    ...overrides,
  },
  valueTransfers: [],
  fee: null,
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
    const cached = buildV5Transaction({ id: '0xabc' });
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
    const fetched = buildV5Transaction({ id: '0xdef' });
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
