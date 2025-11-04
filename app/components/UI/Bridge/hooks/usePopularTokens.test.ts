import { renderHook, waitFor } from '@testing-library/react-native';
import { CaipChainId, CaipAssetType } from '@metamask/utils';
import { usePopularTokens, clearPopularTokensCache } from './usePopularTokens';

// Mock fetch
global.fetch = jest.fn();

const mockPopularTokens = [
  {
    assetId:
      'eip155:1/erc20:0x1234567890123456789012345678901234567890' as CaipAssetType,
    chainId: 'eip155:1' as CaipChainId,
    decimals: 18,
    image: 'https://example.com/token.png',
    name: 'Test Token',
    symbol: 'TEST',
  },
  {
    assetId:
      'eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as CaipAssetType,
    chainId: 'eip155:1' as CaipChainId,
    decimals: 6,
    image: 'https://example.com/token2.png',
    name: 'Another Token',
    symbol: 'ANOT',
    noFee: {
      isSource: true,
      isDestination: false,
    },
  },
];

describe('usePopularTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPopularTokensCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('fetches popular tokens on initial render', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockPopularTokens,
    });

    const { result } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.popularTokens).toEqual(mockPopularTokens);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://bridge.dev-api.cx.metamask.io/getTokens/popular',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainIds: ['eip155:1'],
          excludeAssetIds: [],
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('uses cached data within 15 minutes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockPopularTokens,
    });

    // First render - should fetch
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.popularTokens).toEqual(mockPopularTokens);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount1();

    // Second render with same params - should use cache
    const { result: result2 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.popularTokens).toEqual(mockPopularTokens);
    // Should still be 1 - no new fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('refetches after cache expires at 15 minutes', async () => {
    jest.useFakeTimers();

    const newMockTokens = [
      {
        assetId:
          'eip155:1/erc20:0x9999999999999999999999999999999999999999' as CaipAssetType,
        chainId: 'eip155:1' as CaipChainId,
        decimals: 18,
        image: 'https://example.com/new-token.png',
        name: 'New Token',
        symbol: 'NEW',
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => mockPopularTokens,
      })
      .mockResolvedValueOnce({
        json: async () => newMockTokens,
      });

    // First render
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.popularTokens).toEqual(mockPopularTokens);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount1();

    // Advance time by 15 minutes + 1 second
    jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

    // Second render after cache expiry
    const { result: result2 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.popularTokens).toEqual(newMockTokens);
    // Should have fetched again
    expect(global.fetch).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('uses different cache keys for different chain IDs', async () => {
    const chain1Tokens = [mockPopularTokens[0]];
    const chain2Tokens = [mockPopularTokens[1]];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => chain1Tokens,
      })
      .mockResolvedValueOnce({
        json: async () => chain2Tokens,
      });

    // First render with chain 1
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.popularTokens).toEqual(chain1Tokens);

    unmount1();

    // Second render with chain 137
    const { result: result2 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:137' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.popularTokens).toEqual(chain2Tokens);
    // Should have fetched for both chains
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses different cache keys for different excludeAssetIds', async () => {
    const tokens1 = [mockPopularTokens[0]];
    const tokens2 = [mockPopularTokens[1]];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => tokens1,
      })
      .mockResolvedValueOnce({
        json: async () => tokens2,
      });

    // First render with no excluded assets
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.popularTokens).toEqual(tokens1);

    unmount1();

    // Second render with excluded assets
    const { result: result2 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: JSON.stringify([
          'eip155:1/erc20:0x1234567890123456789012345678901234567890',
        ]),
      }),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.popularTokens).toEqual(tokens2);
    // Should have fetched for both different exclude lists
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('sorts chain IDs in cache key to ensure consistent caching', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockPopularTokens,
    });

    // First render with chain IDs in one order
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:137' as CaipChainId, 'eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(result1.current.popularTokens).toEqual(mockPopularTokens);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount1();

    // Second render with chain IDs in different order - should use cache
    const { result: result2 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId, 'eip155:137' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.popularTokens).toEqual(mockPopularTokens);
    // Should still be 1 - cache hit despite different order
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('parses excludeAssetIds correctly', async () => {
    const excludeAssetIds = [
      'eip155:1/erc20:0x1234567890123456789012345678901234567890' as CaipAssetType,
      'eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as CaipAssetType,
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockPopularTokens,
    });

    const { result } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: JSON.stringify(excludeAssetIds),
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://bridge.dev-api.cx.metamask.io/getTokens/popular',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainIds: ['eip155:1'],
          excludeAssetIds,
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('cleans up expired cache entries automatically', async () => {
    jest.useFakeTimers();

    // First fetch - populate cache
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockPopularTokens,
    });

    const { result: result1, unmount: unmount1 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:1' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    unmount1();

    // Advance time past cache expiry (15 minutes + 1 second)
    jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

    // Second fetch with different params - should trigger cleanup
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => [mockPopularTokens[0]],
    });

    const { result: result2 } = renderHook(() =>
      usePopularTokens({
        chainIds: ['eip155:137' as CaipChainId],
        excludeAssetIds: '[]',
      }),
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // Should have fetched twice (once for each unique param set)
    // The first cache entry should have been cleaned up automatically
    expect(global.fetch).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('prevents race conditions when parameters change rapidly', async () => {
    const chain1Tokens = [mockPopularTokens[0]];
    const chain2Tokens = [mockPopularTokens[1]];

    // Mock slow fetch for chain 1
    let resolveChain1: ((value: unknown) => void) | undefined;
    const chain1Promise = new Promise((resolve) => {
      resolveChain1 = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(() => chain1Promise);

    // Start with chain 1 (slow fetch)
    const { result, rerender } = renderHook(
      ({ chainIds }) =>
        usePopularTokens({
          chainIds,
          excludeAssetIds: '[]',
        }),
      {
        initialProps: { chainIds: ['eip155:1' as CaipChainId] },
      },
    );

    expect(result.current.isLoading).toBe(true);

    // Quickly switch to chain 2 (fast fetch with cache miss)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => chain2Tokens,
    });

    rerender({ chainIds: ['eip155:137' as CaipChainId] });

    // Wait for chain 2 to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should show chain 2 tokens
    expect(result.current.popularTokens).toEqual(chain2Tokens);

    // Now resolve the slow chain 1 request
    resolveChain1?.({
      json: async () => chain1Tokens,
    });

    // Wait a bit to ensure stale request doesn't update state
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should STILL show chain 2 tokens (not overwritten by chain 1)
    expect(result.current.popularTokens).toEqual(chain2Tokens);
  });
});
