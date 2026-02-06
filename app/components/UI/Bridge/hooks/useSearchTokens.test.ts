import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSearchTokens } from './useSearchTokens';
import {
  createMockPopularToken,
  createMockSearchResponse,
  createMockPaginatedResponse,
  MOCK_CHAIN_IDS,
} from '../testUtils/fixtures';

global.fetch = jest.fn();

describe('useSearchTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultParams = {
    chainIds: [MOCK_CHAIN_IDS.ethereum],
    includeAssets: '[]',
  };

  describe('initial state', () => {
    it('returns empty state on initialization', () => {
      const { result } = renderHook(() => useSearchTokens(defaultParams));

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearchLoading).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.searchCursor).toBeUndefined();
    });
  });

  describe('searching', () => {
    it('fetches search results when searchTokens is called', async () => {
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test query');
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(result.current.searchResults).toEqual(mockResponse.data);
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
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      await waitFor(() =>
        expect(result.current.searchResults.length).toBeGreaterThan(0),
      );

      await act(async () => {
        await result.current.searchTokens('');
      });

      expect(result.current.searchResults).toEqual([]);
    });

    it('includes includeAssets in request body', async () => {
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
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
        useSearchTokens({ ...defaultParams, includeAssets }),
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
  });

  describe('debouncing', () => {
    it('debounces search calls', async () => {
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('test');
        result.current.debouncedSearch('test q');
        result.current.debouncedSearch('test qu');
        result.current.debouncedSearch('test query');
      });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/getTokens/search'),
        expect.objectContaining({
          body: expect.stringContaining('test query'),
        }),
      );
    });

    it('ignores queries below minimum length', async () => {
      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('te');
      });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('handles pagination with cursor', async () => {
      const firstPage = createMockPaginatedResponse({
        data: [createMockPopularToken({ symbol: 'FIRST' })],
        cursor: 'cursor123',
      });
      const secondPage = createMockSearchResponse({
        data: [createMockPopularToken({ symbol: 'SECOND' })],
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => firstPage })
        .mockResolvedValueOnce({ json: async () => secondPage });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      await waitFor(() =>
        expect(result.current.searchCursor).toBe('cursor123'),
      );

      await act(async () => {
        await result.current.searchTokens('test', 'cursor123');
      });

      await waitFor(() => expect(result.current.searchResults.length).toBe(2));

      expect(result.current.searchResults[0].symbol).toBe('FIRST');
      expect(result.current.searchResults[1].symbol).toBe('SECOND');
    });

    it('sets isLoadingMore for pagination requests', async () => {
      const firstPage = createMockPaginatedResponse();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => firstPage })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    json: async () => createMockSearchResponse(),
                  }),
                100,
              ),
            ),
        );

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      act(() => {
        result.current.searchTokens('test', 'cursor123');
      });

      await waitFor(() => expect(result.current.isLoadingMore).toBe(true));

      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    });
  });

  describe('reset', () => {
    it('resets search state on resetSearch call', async () => {
      const mockResponse = createMockPaginatedResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      await waitFor(() =>
        expect(result.current.searchResults.length).toBeGreaterThan(0),
      );

      act(() => {
        result.current.resetSearch();
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchCursor).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test query');
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(result.current.searchResults).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error searching tokens:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
