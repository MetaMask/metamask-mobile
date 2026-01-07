import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useWrapWithCache } from './useWrapWithCache';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

describe('useWrapWithCache', () => {
  const mockDispatch = jest.fn();
  const mockFetchFunction = jest.fn();
  const mockCacheKey = 'test-cache-key';
  const mockData = { id: 1, name: 'Test Data' };

  const defaultConfig = {
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    fetchOnMount: true,
  };

  // Simulated Redux state that gets updated when dispatch is called
  let mockCacheState: {
    data: Record<string, unknown>;
    timestamps: Record<string, number>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFunction.mockReset();
    mockFetchFunction.mockImplementation(() => new Promise(() => undefined));

    // Reset cache state
    mockCacheState = {
      data: {},
      timestamps: {},
    };

    // Mock dispatch to update cache state (simulating Redux behavior)
    mockDispatch.mockImplementation(
      (action: {
        type: string;
        payload?: { key: string; data: unknown; timestamp: number };
      }) => {
        if (action.type === 'card/setCacheData' && action.payload) {
          mockCacheState.data[action.payload.key] = action.payload.data;
          mockCacheState.timestamps[action.payload.key] =
            action.payload.timestamp;
        }
      },
    );
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Mock selector to return current cache state
    mockUseSelector.mockImplementation((selector) => {
      const mockState = {
        card: {
          cache: mockCacheState,
        },
      };
      return selector(mockState);
    });
  });

  describe('Initial State', () => {
    it('initializes with correct default state when no cached data exists', () => {
      // Given: No cached data in Redux (default state)

      // When: Hook is rendered with fetchOnMount disabled
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      // Then: Should have correct initial state
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('initializes with cached data when available in Redux', () => {
      const cachedData = mockData;
      const cachedTimestamp = Date.now() - 1000; // 1 second ago

      // Given: Cached data exists in Redux
      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = cachedTimestamp;

      // When: Hook is rendered
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should initialize with cached data
      expect(result.current.data).toEqual(mockData);
    });

    it('handles null cached data gracefully', () => {
      // Given: Cached data is null (default state handles this)

      // When: Hook is rendered
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should handle null data gracefully
      expect(result.current.data).toBeNull();
    });
  });

  describe('Cache Validation', () => {
    it('considers cache valid when data is fresh', () => {
      // Given: Fresh cached data (within the 5 minute default cache duration)
      const cachedData = mockData;
      // Use a timestamp that's definitely fresh (30 seconds ago)
      const recentTimestamp = Date.now() - 30 * 1000; // 30 seconds ago

      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = recentTimestamp;

      // When: Hook is rendered with fresh cache and fetchOnMount disabled to isolate cache logic
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      // Then: Should use cached data
      expect(result.current.data).toEqual(cachedData);
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('considers cache invalid when data is stale', () => {
      const staleTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago (older than 5min cache duration)
      const cachedData = mockData;

      // Given: Stale cached data and fetchOnMount enabled
      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = staleTimestamp;
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves – we only need to know fetch was triggered
          }),
      );

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should trigger fetch for stale cache
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });

    it('considers cache invalid when lastFetched is null', () => {
      const cachedData = mockData;

      // Given: Cached data without lastFetched timestamp
      mockCacheState.data[mockCacheKey] = cachedData;
      // No timestamp for this key - intentionally omitted
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves – we only need to know fetch was triggered
          }),
      );

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should trigger fetch when lastFetched is null
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fetch Behavior', () => {
    it('fetches data on mount when fetchOnMount is true and no valid cache', () => {
      // Given: No cached data and fetchOnMount enabled (default state)
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves – we only need to know fetch was triggered
          }),
      );

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should fetch data on mount
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });

    it('prevents infinite loops by not fetching when already loading', () => {
      // Given: Hook with slow fetch
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves - simulates long fetch
          }),
      );

      // When: Hook is rendered and re-renders while loading
      const { rerender } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Force multiple re-renders while loading
      rerender();
      rerender();
      rerender();

      // Then: Should only call fetch once despite re-renders
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });

    it('prevents retry loops by not auto-fetching when error exists', async () => {
      const mockError = new Error('Network error');

      // Given: Initial fetch fails with error
      mockFetchFunction.mockRejectedValueOnce(mockError);

      // When: Hook is rendered and encounters error
      const { result, waitForNextUpdate, rerender } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Error state is set
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');

      // Clear the mock to track new calls
      mockFetchFunction.mockClear();

      // When: Component re-renders with error state
      rerender();
      rerender();

      // Then: Should not retry fetch automatically (user must manually retry)
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('does not fetch data on mount when fetchOnMount is false', () => {
      const config = { ...defaultConfig, fetchOnMount: false };

      // Given: fetchOnMount is disabled (default state)

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, config),
      );

      // Then: Should not fetch data on mount
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('stores fetched data when fetchData resolves', async () => {
      // Given: No cached data and manual fetch
      const fetchPromise = Promise.resolve(mockData);
      mockFetchFunction.mockReturnValue(fetchPromise);

      // When: Hook is rendered with fetchOnMount disabled
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      // Then: Should dispatch action with fetched data
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setCacheData',
        payload: {
          key: mockCacheKey,
          data: mockData,
          timestamp: expect.any(Number),
        },
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('handles Error instances from fetch failures', async () => {
      const mockError = new Error('Test error');

      // Given: No cached data and fetch will fail (default state)
      mockFetchFunction.mockRejectedValue(mockError);

      // When: Hook is rendered and fetch fails
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Should update state with error object
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Test error');
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('converts non-Error objects to Error instances', async () => {
      const nonErrorObject = { message: 'API returned error', code: 500 };

      // Given: Fetch fails with non-Error object
      mockFetchFunction.mockRejectedValue(nonErrorObject);

      // When: Hook is rendered and fetch fails
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Should convert to Error instance
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('[object Object]');
    });

    it('converts string errors to Error instances', async () => {
      const stringError = 'Something went wrong';

      // Given: Fetch fails with string error
      mockFetchFunction.mockRejectedValue(stringError);

      // When: Hook is rendered and fetch fails
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Should convert to Error instance
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Something went wrong');
    });

    it('sets loading state during fetch', () => {
      // Given: No cached data and slow fetch (default state)
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      // When: Hook is rendered
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should be in loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Manual Fetch', () => {
    it('allows manual data fetching via fetchData function', async () => {
      // Given: Hook with cached data and fetchOnMount disabled
      const cachedData = mockData;
      const cachedTimestamp = Date.now() - 1000;
      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = cachedTimestamp;

      const newData = { id: 2, name: 'New Data' };
      mockFetchFunction.mockResolvedValue(newData);

      // When: Manual fetch is triggered
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false, // Disable auto-fetch
        }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      // Then: Should fetch and update with new data
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setCacheData',
        payload: {
          key: mockCacheKey,
          data: newData,
          timestamp: expect.any(Number),
        },
      });
    });

    it('handles manual fetch errors', async () => {
      const mockError = new Error('Test error');

      // Given: Hook with cached data
      const cachedData = mockData;
      const cachedTimestamp = Date.now() - 1000;
      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = cachedTimestamp;
      mockFetchFunction.mockRejectedValue(mockError);

      // When: Manual fetch fails
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      // Then: Should update error state but keep cached data
      expect(result.current.data).toEqual(mockData); // Should keep cached data
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Test error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Configuration Options', () => {
    it('respects custom cache duration', () => {
      // Given: Fresh cached data with custom cache duration
      const cachedData = mockData;
      const recentTimestamp = Date.now() - 30000; // 30 seconds ago
      const customConfig = { cacheDuration: 60000, fetchOnMount: false }; // 1 minute cache, no fetch on mount

      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = recentTimestamp;

      // When: Hook is rendered with custom cache duration
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, customConfig),
      );

      // Then: Should not fetch because cache is still valid
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('handles zero cache duration by always fetching', () => {
      // Given: Cached data with zero cache duration (always fetch)
      const cachedData = mockData;
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      const zeroConfig = { cacheDuration: 0, fetchOnMount: true }; // Always fetch

      mockCacheState.data[mockCacheKey] = cachedData;
      mockCacheState.timestamps[mockCacheKey] = recentTimestamp;
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves – we only need to know fetch was triggered
          }),
      );

      // When: Hook is rendered with zero cache duration
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, zeroConfig),
      );

      // Then: Should always fetch regardless of cache
      expect(mockFetchFunction).toHaveBeenCalled();
    });
  });

  describe('Redux Integration', () => {
    it('uses correct selector for cache key', () => {
      // Given: Hook with specific cache key (default state)

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should call useSelector with correct selector
      expect(mockUseSelector).toHaveBeenCalledWith(expect.any(Function));
    });

    it('dispatches cache updates with correct structure', async () => {
      // Given: No cached data and manual fetch trigger
      mockFetchFunction.mockResolvedValue(mockData);

      // When: Data is fetched via fetchData
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      // Then: Should dispatch correct action structure
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setCacheData',
        payload: {
          key: mockCacheKey,
          data: mockData,
          timestamp: expect.any(Number),
        },
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('skips caching when fetch returns null', async () => {
      // Given: Fetch function returns null via manual fetch
      mockFetchFunction.mockResolvedValue(null);

      // When: fetchData is called manually
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      // Then: Should not cache null responses
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('skips caching when fetch returns undefined', async () => {
      // Given: Fetch function returns undefined and manual fetch trigger
      mockFetchFunction.mockResolvedValue(undefined);

      // When: fetchData is called manually
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      await act(async () => {
        await result.current.fetchData();
      });

      // Then: Should not cache undefined responses
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('handles empty cache key', () => {
      // Given: Empty cache key
      const emptyCacheKey = '';

      // When: Hook is rendered with empty cache key
      const { result } = renderHook(() =>
        useWrapWithCache(emptyCacheKey, mockFetchFunction, {
          fetchOnMount: false,
        }),
      );

      // Then: Should not be loading and should not fetch
      expect(result.current.isLoading).toBe(false);
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('cleans up properly on unmount', () => {
      // Given: Hook with ongoing fetch (default state)
      mockFetchFunction.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          }),
      );

      // When: Hook is mounted and then unmounted
      const { unmount } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );
      unmount();

      // Then: Should not cause memory leaks or errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
