import { renderHook } from '@testing-library/react-hooks';
import { useApiTransaction } from './useApiTransaction';
import { useCachedEvmTransaction } from './useCachedEvmTransaction';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('./useCachedEvmTransaction');
jest.mock('./useTransactionQuery');

const useCachedEvmTransactionMock = jest.mocked(useCachedEvmTransaction);
const useTransactionQueryMock = jest.mocked(useTransactionQuery);

describe('useApiTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useTransactionQuery>);
  });

  it('returns the cached transaction without fetching', () => {
    const cached = { chainId: 1, hash: '0xabc' };
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
    const fetched = { chainId: 1, hash: '0xdef' };
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
