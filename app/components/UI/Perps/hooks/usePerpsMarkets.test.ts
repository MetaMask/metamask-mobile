import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsMarkets } from './usePerpsMarkets';
import type { PerpsMarketData } from '../controllers/types';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

// Mock PerpsStreamManager
const mockSubscribe = jest.fn();
const mockRefresh = jest.fn();
const mockMarketData = {
  subscribe: mockSubscribe,
  refresh: mockRefresh,
};

jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    marketData: mockMarketData,
  })),
}));

// Mock data
const mockMarketDataArray: PerpsMarketData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '40x',
    price: '$50,000.00',
    change24h: '+2.5%',
    change24hPercent: '2.5',
    volume: '$1.2B',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    maxLeverage: '25x',
    price: '$3,000.00',
    change24h: '-1.2%',
    change24hPercent: '-1.2',
    volume: '$900M',
  },
];

const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up default mock behavior
    mockSubscribe.mockImplementation(({ callback }) => {
      // Simulate immediate callback with data
      setTimeout(() => callback(mockMarketDataArray), 0);
      // Return unsubscribe function
      return jest.fn();
    });
    mockRefresh.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with empty markets and loading true', () => {
      // Setup to not call the callback immediately
      mockSubscribe.mockImplementation(() => jest.fn());

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsMarkets({ skipInitialFetch: true }),
      );

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful data fetching', () => {
    it('fetches market data successfully on mount', async () => {
      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - markets should be sorted by volume (BTC first due to $1.2B vs $900M)
      expect(result.current.markets).toHaveLength(2);
      expect(result.current.markets[0].symbol).toBe('BTC');
      expect(result.current.markets[1].symbol).toBe('ETH');
      expect(result.current.error).toBeNull();
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Market data received (first load)',
        expect.objectContaining({
          marketCount: 2,
          cacheHit: expect.any(Boolean),
          source: expect.any(String),
          timeToDataMs: expect.any(Number),
        }),
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsMarkets({ skipInitialFetch: true }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.markets).toEqual([]);
      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it('updates markets when data changes', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newMarketData = [
        {
          symbol: 'DOGE',
          name: 'Dogecoin',
          maxLeverage: '10x',
          price: '$0.10',
          change24h: '+5.0%',
          change24hPercent: '5.0',
          volume: '$100M',
        },
      ];

      // Simulate data update by calling the callback again
      const subscriberCallback = mockSubscribe.mock.calls[0][0].callback;

      // Act
      act(() => {
        subscriberCallback(newMarketData);
      });

      // Assert
      expect(result.current.markets).toEqual(newMarketData);
    });

    it('handles empty market data', async () => {
      // Arrange
      mockSubscribe.mockImplementation(({ callback }) => {
        setTimeout(() => callback([]), 0);
        return jest.fn();
      });

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.markets).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Manual refresh', () => {
    it('refreshes market data when refresh is called', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(result.current.isRefreshing).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Manual refresh completed',
      );
    });

    it('sets isRefreshing state during refresh', async () => {
      // Arrange
      let resolveRefresh: () => void;
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefresh.mockReturnValue(refreshPromise);

      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - start refresh
      const refreshCall = act(() => result.current.refresh());

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);

      // Complete refresh
      await act(async () => {
        resolveRefresh?.();
        await refreshCall;
      });

      // Assert - no longer refreshing
      expect(result.current.isRefreshing).toBe(false);
    });

    it('handles refresh errors gracefully', async () => {
      // Arrange
      const refreshError = new Error('Failed to fetch markets');
      mockRefresh.mockRejectedValue(refreshError);

      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.error).toBe('Failed to fetch markets');
      expect(result.current.isRefreshing).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Failed to refresh market data',
        refreshError,
      );
    });
  });

  describe('Polling', () => {
    it('polls for updates when enablePolling is true', async () => {
      // Arrange
      const pollingInterval = 5000;

      // Act
      renderHook(() =>
        usePerpsMarkets({
          enablePolling: true,
          pollingInterval,
        }),
      );

      // Wait for initial load
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Clear previous calls
      mockRefresh.mockClear();

      // Advance time to trigger polling
      await act(async () => {
        jest.advanceTimersByTime(pollingInterval);
      });

      // Assert
      expect(mockRefresh).toHaveBeenCalledTimes(1);

      // Advance time again
      await act(async () => {
        jest.advanceTimersByTime(pollingInterval);
      });

      // Assert
      expect(mockRefresh).toHaveBeenCalledTimes(2);
    });

    it('does not poll when enablePolling is false', async () => {
      // Act
      renderHook(() =>
        usePerpsMarkets({
          enablePolling: false,
          pollingInterval: 5000,
        }),
      );

      // Wait for initial load
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Clear previous calls
      mockRefresh.mockClear();

      // Advance time
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Assert - refresh should not have been called
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('cleans up polling interval on unmount', async () => {
      // Arrange
      const { unmount } = renderHook(() =>
        usePerpsMarkets({
          enablePolling: true,
          pollingInterval: 5000,
        }),
      );

      // Wait for initial load
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Clear previous calls
      mockRefresh.mockClear();

      // Act - unmount
      unmount();

      // Advance time after unmount
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Assert - refresh should not have been called after unmount
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('handles polling errors gracefully', async () => {
      // Arrange
      mockRefresh.mockRejectedValue(new Error('Polling failed'));

      // Act
      renderHook(() =>
        usePerpsMarkets({
          enablePolling: true,
          pollingInterval: 5000,
        }),
      );

      // Wait for initial load
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Clear logs
      mockLogger.log.mockClear();

      // Advance time to trigger polling
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Assert - error should be logged but not crash
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Polling refresh failed',
        expect.any(Error),
      );
    });
  });

  describe('Volume sorting', () => {
    it('sorts markets by volume correctly', async () => {
      // Arrange - markets with various volume formats
      const unsortedMarkets: PerpsMarketData[] = [
        {
          symbol: 'A',
          name: 'A',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '$100K',
        },
        {
          symbol: 'B',
          name: 'B',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '$1.5B',
        },
        {
          symbol: 'C',
          name: 'C',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '$<1',
        },
        {
          symbol: 'D',
          name: 'D',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '$500M',
        },
        {
          symbol: 'E',
          name: 'E',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '—',
        },
        {
          symbol: 'F',
          name: 'F',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '$0',
        },
        {
          symbol: 'G',
          name: 'G',
          maxLeverage: '1x',
          price: '$1',
          change24h: '+0%',
          change24hPercent: '0',
          volume: '—',
        },
      ];

      mockSubscribe.mockImplementation(({ callback }) => {
        setTimeout(() => callback(unsortedMarkets), 0);
        return jest.fn();
      });

      // Act
      const { result } = renderHook(() => usePerpsMarkets());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should be sorted by volume descending
      const sortedSymbols = result.current.markets.map((m) => m.symbol);
      expect(sortedSymbols).toEqual(['B', 'D', 'A', 'C', 'F', 'E', 'G']);
    });
  });

  describe('Cleanup', () => {
    it('unsubscribes from market data on unmount', () => {
      // Arrange
      const unsubscribeFn = jest.fn();
      mockSubscribe.mockReturnValue(unsubscribeFn);

      // Act
      const { unmount } = renderHook(() => usePerpsMarkets());
      unmount();

      // Assert
      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });
});
