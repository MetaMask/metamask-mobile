import { renderHook } from '@testing-library/react-hooks';
import type { InfiniteData } from '@tanstack/react-query';
import type { V5MultiAccountTransactionsResponse } from '@metamask/core-backend';
import {
  activityQueryKey,
  useCachedEvmTransaction,
} from './useCachedEvmTransaction';

const mockGetQueriesData = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    getQueriesData: mockGetQueriesData,
  }),
}));

describe('useCachedEvmTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined for non-EVM chains', () => {
    const { result } = renderHook(() =>
      useCachedEvmTransaction({
        chainId: 'solana:mainnet',
        txHash: '0xabc',
      }),
    );

    expect(result.current).toBeUndefined();
    expect(mockGetQueriesData).not.toHaveBeenCalled();
  });

  it('returns a cached transaction from the activity list query cache', () => {
    const transaction = {
      tx: {
        chainId: 'eip155:1',
        id: '0xABC',
      },
    };
    mockGetQueriesData.mockReturnValue([
      [
        ['accounts', 'transactions', 'v5MultiAccount'],
        {
          pages: [{ data: [transaction] }],
        } as InfiniteData<V5MultiAccountTransactionsResponse>,
      ],
    ]);

    const { result } = renderHook(() =>
      useCachedEvmTransaction({
        chainId: 'eip155:1',
        txHash: '0xabc',
      }),
    );

    expect(mockGetQueriesData).toHaveBeenCalledWith({
      queryKey: activityQueryKey,
    });
    expect(result.current).toBe(transaction);
  });

  it('skips a cached row that has no v5 tx instead of throwing', () => {
    mockGetQueriesData.mockReturnValue([
      [
        ['accounts', 'transactions', 'v5MultiAccount'],
        {
          pages: [
            {
              data: [
                { hash: '0xabc' },
                { tx: { chainId: 'eip155:1', id: '0xdef' } },
              ],
            },
          ],
        } as unknown as InfiniteData<V5MultiAccountTransactionsResponse>,
      ],
    ]);

    const { result } = renderHook(() =>
      useCachedEvmTransaction({
        chainId: 'eip155:1',
        txHash: '0xdef',
      }),
    );

    expect(result.current).toEqual({
      tx: { chainId: 'eip155:1', id: '0xdef' },
    });
  });
});
