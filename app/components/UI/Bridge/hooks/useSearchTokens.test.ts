import { renderHook, waitFor, act } from '@testing-library/react-native';
import { CaipChainId } from '@metamask/utils';
import { useSearchTokens } from './useSearchTokens';

// Mock fetch
global.fetch = jest.fn();

const mockSearchResponse = {
  data: [
    {
      assetId: 'eip155:1/erc20:0x1234567890123456789012345678901234567890',
      chainId: 'eip155:1',
      decimals: 18,
      image: 'https://example.com/token.png',
      name: 'Search Token',
      symbol: 'SRCH',
    },
  ],
  count: 1,
  totalCount: 1,
  pageInfo: {
    hasNextPage: false,
    endCursor: undefined,
  },
};

const mockPaginatedResponse = {
  data: [
    {
      assetId: 'eip155:1/erc20:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chainId: 'eip155:1',
      decimals: 18,
      image: 'https://example.com/token.png',
      name: 'First Token',
      symbol: 'FIRST',
    },
  ],
  count: 1,
  totalCount: 10,
  pageInfo: {
    hasNextPage: true,
    endCursor: 'cursor123',
  },
};

describe('useSearchTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial empty state', () => {
    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.isSearchLoading).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.searchCursor).toBeUndefined();
  });

  it('fetches search results when searchTokens is called', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockSearchResponse,
    });

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    await act(async () => {
      await result.current.searchTokens('test query');
    });

    await waitFor(() => {
      expect(result.current.isSearchLoading).toBe(false);
    });

    expect(result.current.searchResults).toEqual(mockSearchResponse.data);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/getTokens/search'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('test query'),
      }),
    );
  });

  it('resets search when query is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockSearchResponse,
    });

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    // First search with results
    await act(async () => {
      await result.current.searchTokens('test');
    });

    await waitFor(() => {
      expect(result.current.searchResults.length).toBeGreaterThan(0);
    });

    // Reset by searching empty query
    await act(async () => {
      await result.current.searchTokens('');
    });

    expect(result.current.searchResults).toEqual([]);
  });

  it('handles pagination with cursor', async () => {
    const secondPageResponse = {
      data: [
        {
          assetId: 'eip155:1/erc20:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          chainId: 'eip155:1',
          decimals: 18,
          image: 'https://example.com/token2.png',
          name: 'Second Token',
          symbol: 'SECOND',
        },
      ],
      count: 1,
      totalCount: 10,
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => mockPaginatedResponse })
      .mockResolvedValueOnce({ json: async () => secondPageResponse });

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    // First search
    await act(async () => {
      await result.current.searchTokens('test');
    });

    await waitFor(() => {
      expect(result.current.searchCursor).toBe('cursor123');
    });

    // Pagination request
    await act(async () => {
      await result.current.searchTokens('test', 'cursor123');
    });

    await waitFor(() => {
      expect(result.current.searchResults.length).toBe(2);
    });

    expect(result.current.searchResults[0].symbol).toBe('FIRST');
    expect(result.current.searchResults[1].symbol).toBe('SECOND');
  });

  it('debounces search calls', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => mockSearchResponse,
    });

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    // Call debounced search multiple times rapidly
    act(() => {
      result.current.debouncedSearch('test');
      result.current.debouncedSearch('test q');
      result.current.debouncedSearch('test qu');
      result.current.debouncedSearch('test que');
      result.current.debouncedSearch('test query');
    });

    // Advance timers past debounce delay
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.isSearchLoading).toBe(false);
    });

    // Only one fetch call due to debouncing
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/getTokens/search'),
      expect.objectContaining({
        body: expect.stringContaining('test query'),
      }),
    );
  });

  it('ignores queries below minimum length', async () => {
    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    // Call with short query
    act(() => {
      result.current.debouncedSearch('te');
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('resets search state on resetSearch call', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockPaginatedResponse,
    });

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    await act(async () => {
      await result.current.searchTokens('test');
    });

    await waitFor(() => {
      expect(result.current.searchResults.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.resetSearch();
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.searchCursor).toBeUndefined();
  });

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    await act(async () => {
      await result.current.searchTokens('test query');
    });

    await waitFor(() => {
      expect(result.current.isSearchLoading).toBe(false);
    });

    expect(result.current.searchResults).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error searching tokens:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('includes includeAssets in request body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => mockSearchResponse,
    });

    const includeAssets = JSON.stringify([
      {
        assetId: 'eip155:1/erc20:0xincluded',
        name: 'Included Token',
        symbol: 'INC',
        decimals: 18,
      },
    ]);

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets,
      }),
    );

    await act(async () => {
      await result.current.searchTokens('test');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('includeAssets'),
      }),
    );
  });

  it('sets isLoadingMore for pagination requests', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => mockPaginatedResponse })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  json: async () => ({
                    ...mockSearchResponse,
                    pageInfo: { hasNextPage: false },
                  }),
                }),
              100,
            ),
          ),
      );

    const { result } = renderHook(() =>
      useSearchTokens({
        chainIds: ['eip155:1' as CaipChainId],
        includeAssets: '[]',
      }),
    );

    // Initial search
    await act(async () => {
      await result.current.searchTokens('test');
    });

    // Start pagination request
    act(() => {
      result.current.searchTokens('test', 'cursor123');
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(true);
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });
  });
});
