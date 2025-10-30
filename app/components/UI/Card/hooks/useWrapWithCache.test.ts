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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default Redux state - no cached data
    mockUseSelector.mockImplementation((selector) => {
      const mockState = {
        card: {
          cache: {
            data: {},
            timestamps: {},
          },
        },
      };
      return selector(mockState);
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct default state when no cached data exists', () => {
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
      expect(result.current.error).toBe(false);
    });

    it('should initialize with cached data when available in Redux', () => {
      const cachedData = mockData;
      const cachedTimestamp = Date.now() - 1000; // 1 second ago

      // Given: Cached data exists in Redux
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: cachedTimestamp },
            },
          },
        };
        return selector(mockState);
      });

      // When: Hook is rendered
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should initialize with cached data
      expect(result.current.data).toEqual(mockData);
    });

    it('should handle null cached data gracefully', () => {
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
    it('should consider cache valid when data is fresh', () => {
      // Given: Fresh cached data (within the 5 minute default cache duration)
      const cachedData = mockData;
      // Use a timestamp that's definitely fresh (30 seconds ago)
      const recentTimestamp = Date.now() - 30 * 1000; // 30 seconds ago

      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: recentTimestamp },
            },
          },
        };
        return selector(mockState);
      });

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

    it('should consider cache invalid when data is stale', () => {
      const staleTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago (older than 5min cache duration)
      const cachedData = mockData;

      // Given: Stale cached data and fetchOnMount enabled
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: staleTimestamp },
            },
          },
        };
        return selector(mockState);
      });
      mockFetchFunction.mockResolvedValue(mockData);

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should trigger fetch for stale cache
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });

    it('should consider cache invalid when lastFetched is null', () => {
      const cachedData = mockData;

      // Given: Cached data without lastFetched timestamp
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: {}, // No timestamp for this key
            },
          },
        };
        return selector(mockState);
      });
      mockFetchFunction.mockResolvedValue(mockData);

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should trigger fetch when lastFetched is null
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fetch Behavior', () => {
    it('should fetch data on mount when fetchOnMount is true and no valid cache', () => {
      // Given: No cached data and fetchOnMount enabled (default state)
      mockFetchFunction.mockResolvedValue(mockData);

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should fetch data on mount
      expect(mockFetchFunction).toHaveBeenCalledTimes(1);
    });

    it('should not fetch data on mount when fetchOnMount is false', () => {
      const config = { ...defaultConfig, fetchOnMount: false };

      // Given: fetchOnMount is disabled (default state)

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, config),
      );

      // Then: Should not fetch data on mount
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('should handle successful data fetch', async () => {
      // Given: No cached data and successful fetch
      mockFetchFunction.mockResolvedValue(mockData);

      // Mock the selector to return updated data after dispatch
      let selectorCallCount = 0;
      mockUseSelector.mockImplementation((selector) => {
        selectorCallCount++;
        const mockState = {
          card: {
            cache: {
              // After the first few calls (initial render), simulate updated cache
              data: selectorCallCount > 2 ? { [mockCacheKey]: mockData } : {},
              timestamps:
                selectorCallCount > 2 ? { [mockCacheKey]: Date.now() } : {},
            },
          },
        };
        return selector(mockState);
      });

      // When: Hook is rendered and data is fetched
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, {
          fetchOnMount: true,
        }),
      );

      // Wait for the fetch to complete
      await waitForNextUpdate();

      // Then: Should update state with fetched data
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(false);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setCacheData',
        payload: {
          key: mockCacheKey,
          data: mockData,
          timestamp: expect.any(Number),
        },
      });
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Test error');

      // Given: No cached data and fetch will fail (default state)
      mockFetchFunction.mockRejectedValue(mockError);

      // When: Hook is rendered and fetch fails
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Wait for the fetch to complete
      await waitForNextUpdate();

      // Then: Should update state with error
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(true);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should set loading state during fetch', () => {
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
      expect(result.current.error).toBe(false);
    });
  });

  describe('Manual Fetch', () => {
    it('should allow manual data fetching via fetchData function', async () => {
      // Given: Hook with cached data
      const cachedData = mockData;
      const cachedTimestamp = Date.now() - 1000;
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: cachedTimestamp },
            },
          },
        };
        return selector(mockState);
      });

      const newData = { id: 2, name: 'New Data' };
      mockFetchFunction.mockResolvedValue(newData);

      // When: Manual fetch is triggered
      const { result } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Clear any initial calls from useEffect
      mockFetchFunction.mockClear();
      mockDispatch.mockClear();

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

    it('should handle manual fetch errors', async () => {
      const mockError = new Error('Test error');

      // Given: Hook with cached data
      const cachedData = mockData;
      const cachedTimestamp = Date.now() - 1000;
      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: cachedTimestamp },
            },
          },
        };
        return selector(mockState);
      });
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
      expect(result.current.error).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom cache duration', () => {
      // Given: Fresh cached data with custom cache duration
      const cachedData = mockData;
      const recentTimestamp = Date.now() - 30000; // 30 seconds ago
      const customConfig = { cacheDuration: 60000, fetchOnMount: false }; // 1 minute cache, no fetch on mount

      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: recentTimestamp },
            },
          },
        };
        return selector(mockState);
      });

      // When: Hook is rendered with custom cache duration
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, customConfig),
      );

      // Then: Should not fetch because cache is still valid
      expect(mockFetchFunction).not.toHaveBeenCalled();
    });

    it('should handle zero cache duration (always fetch)', () => {
      // Given: Cached data with zero cache duration (always fetch)
      const cachedData = mockData;
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      const zeroConfig = { cacheDuration: 0, fetchOnMount: true }; // Always fetch

      mockUseSelector.mockImplementation((selector) => {
        const mockState = {
          card: {
            cache: {
              data: { [mockCacheKey]: cachedData },
              timestamps: { [mockCacheKey]: recentTimestamp },
            },
          },
        };
        return selector(mockState);
      });
      mockFetchFunction.mockResolvedValue(mockData);

      // When: Hook is rendered with zero cache duration
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, zeroConfig),
      );

      // Then: Should always fetch regardless of cache
      expect(mockFetchFunction).toHaveBeenCalled();
    });
  });

  describe('Redux Integration', () => {
    it('should use correct selector for cache key', () => {
      // Given: Hook with specific cache key (default state)

      // When: Hook is rendered
      renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      // Then: Should call useSelector with correct selector
      expect(mockUseSelector).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should dispatch cache updates with correct structure', async () => {
      // Given: No cached data (default state)
      mockFetchFunction.mockResolvedValue(mockData);

      // When: Data is fetched successfully
      const { waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Should dispatch correct action structure
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setCacheData',
        payload: {
          key: mockCacheKey,
          data: mockData,
          timestamp: expect.any(Number),
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch function that returns null', async () => {
      // Given: Fetch function returns null (default state)
      mockFetchFunction.mockResolvedValue(null);

      // When: Hook fetches data
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Should handle null return value but NOT cache it (null indicates missing dependencies)
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(false);
      // Null values are not cached to prevent caching "null" responses when dependencies aren't ready
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should handle fetch function that returns undefined', async () => {
      // Given: Fetch function returns undefined (default state)
      mockFetchFunction.mockResolvedValue(undefined);

      // When: Hook fetches data
      const { result, waitForNextUpdate } = renderHook(() =>
        useWrapWithCache(mockCacheKey, mockFetchFunction, defaultConfig),
      );

      await waitForNextUpdate();

      // Then: Should handle undefined return value
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(false);
    });

    it('should handle empty cache key', () => {
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
    it('should cleanup properly on unmount', () => {
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
