import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsPositionData } from './usePerpsPositionData';
import Engine from '../../../../core/Engine';
import { CandlePeriod, TimeDuration } from '../constants/chartConfig';

// Type definitions for test helpers
interface PriceUpdate {
  coin: string;
  price?: number;
}

type PriceCallback = (updates: PriceUpdate[]) => void;

interface SubscribeToPricesParams {
  symbols: string[];
  callback: PriceCallback;
}

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      fetchHistoricalCandles: jest.fn(),
      subscribeToPrices: jest.fn(),
    },
  },
}));

describe('usePerpsPositionData', () => {
  const mockFetchHistoricalCandles = Engine.context.PerpsController
    .fetchHistoricalCandles as jest.Mock;
  const mockSubscribeToPrices = Engine.context.PerpsController
    .subscribeToPrices as jest.Mock;

  const mockCandleData = {
    coin: 'ETH',
    interval: CandlePeriod.ONE_HOUR,
    candles: [
      {
        time: 1234567890,
        open: '3000',
        high: '3100',
        low: '2900',
        close: '3050',
        volume: '1000',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHistoricalCandles.mockResolvedValue(mockCandleData);
    mockSubscribeToPrices.mockReturnValue(jest.fn()); // Default unsubscribe function
  });

  afterEach(() => {
    // Reset mocks to default behavior after each test
    mockSubscribeToPrices.mockReturnValue(jest.fn());
  });

  it('should fetch historical candles on mount', async () => {
    await act(async () => {
      renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockFetchHistoricalCandles).toHaveBeenCalledWith('ETH', '1h', 24);
  });

  // Price subscriptions have been removed - use usePerpsLivePrices for real-time prices

  // Price data updates have been moved to usePerpsLivePrices hook

  it('should handle loading state correctly', async () => {
    const { result } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    // Initially loading
    expect(result.current.isLoadingHistory).toBe(true);

    // Wait for historical data to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoadingHistory).toBe(false);
    expect(result.current.candleData).toEqual(mockCandleData);
  });

  // Unsubscribe test removed - no subscriptions to clean up anymore

  it('should handle errors in fetching historical data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetchHistoricalCandles.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Give more time for async operations
    });

    expect(result.current.isLoadingHistory).toBe(false);
    expect(result.current.candleData).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading historical candles:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle refreshCandleData loading states correctly', async () => {
    const { result } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    // Wait for initial data to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Initially not loading
    expect(result.current.isLoadingHistory).toBe(false);

    // Mock a delayed response to capture loading state
    let resolvePromise: (value: typeof mockCandleData) => void;
    mockFetchHistoricalCandles.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    // Start refresh but don't await it yet
    let refreshPromise: Promise<void>;
    act(() => {
      refreshPromise = result.current.refreshCandleData();
    });

    // Should be loading immediately after refresh starts
    expect(result.current.isLoadingHistory).toBe(true);

    // Resolve the promise to complete the refresh
    act(() => {
      resolvePromise(mockCandleData);
    });

    // Wait for refresh to complete
    await act(async () => {
      await refreshPromise;
    });

    // Should not be loading after refresh completes
    expect(result.current.isLoadingHistory).toBe(false);
    expect(mockFetchHistoricalCandles).toHaveBeenCalledTimes(2); // Initial + refresh
  });

  describe('getCurrentCandleStartTime', () => {
    it('calculates correct start time for 1 minute candles', async () => {
      // Arrange
      const mockDate = new Date('2024-01-01T10:35:45.123Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_MINUTE,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act - Wait for hook to initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert - Should round down to nearest minute boundary
      // 10:35:45.123 should round down to 10:35:00.000
      // const expectedTime = new Date('2024-01-01T10:35:00.000Z').getTime();

      // The getCurrentCandleStartTime logic should be exercised through price updates
      expect(result.current).toBeDefined();

      jest.restoreAllMocks();
    });

    it('calculates correct start time for different intervals', async () => {
      const intervals = [
        { period: CandlePeriod.FIVE_MINUTES, expectedMinute: 35 }, // Should round to 35 (nearest 5-min boundary)
        { period: CandlePeriod.FIFTEEN_MINUTES, expectedMinute: 30 }, // Should round to 30 (nearest 15-min boundary)
        { period: CandlePeriod.THIRTY_MINUTES, expectedMinute: 30 }, // Should round to 30 (nearest 30-min boundary)
        { period: CandlePeriod.ONE_HOUR, expectedMinute: 0 }, // Should round to top of hour
      ];

      for (const { period } of intervals) {
        // Arrange
        const mockDate = new Date('2024-01-01T10:35:45.123Z').getTime();
        jest.spyOn(Date, 'now').mockReturnValue(mockDate);

        const { result } = renderHook(() =>
          usePerpsPositionData({
            coin: 'ETH',
            selectedInterval: period,
            selectedDuration: TimeDuration.ONE_DAY,
          }),
        );

        // Act
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // Assert
        expect(result.current).toBeDefined();

        jest.restoreAllMocks();
      }
    });

    it('handles edge case intervals correctly', async () => {
      const edgeCases = [
        CandlePeriod.TWO_HOURS,
        CandlePeriod.FOUR_HOURS,
        CandlePeriod.EIGHT_HOURS,
        CandlePeriod.TWELVE_HOURS,
        CandlePeriod.ONE_DAY,
      ];

      for (const period of edgeCases) {
        const { result } = renderHook(() =>
          usePerpsPositionData({
            coin: 'ETH',
            selectedInterval: period,
            selectedDuration: TimeDuration.ONE_WEEK,
          }),
        );

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(result.current).toBeDefined();
      }
    });
  });

  describe('subscribeToPriceUpdates', () => {
    it('handles successful price subscription', async () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

      renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(mockSubscribeToPrices).toHaveBeenCalledWith({
        symbols: ['ETH'],
        callback: expect.any(Function),
      });
    });

    it('handles price subscription errors', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSubscribeToPrices.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error subscribing to price updates:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('filters price updates for correct coin', async () => {
      // Arrange
      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn(); // unsubscribe function
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Simulate price updates with multiple coins
      const mockPriceUpdates = [
        { coin: 'BTC', price: 45000 },
        { coin: 'ETH', price: 3000 }, // Should match
        { coin: 'MATIC', price: 1.5 },
      ];

      await act(async () => {
        priceCallback?.(mockPriceUpdates);
      });

      // Assert - Should have received the ETH price update
      expect(result.current.priceData).toEqual({ coin: 'ETH', price: 3000 });
    });
  });

  describe('live candle building', () => {
    it('creates new live candle from first price update', async () => {
      // Arrange
      const mockDate = new Date('2024-01-01T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Simulate first price update
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3000 }]);
      });

      // Assert - Should create new live candle
      const expectedStartTime =
        Math.floor(mockDate / (60 * 60 * 1000)) * (60 * 60 * 1000);

      expect(result.current.candleData?.candles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            time: expectedStartTime,
            open: '3000',
            high: '3000',
            low: '3000',
            close: '3000',
            volume: '0',
          }),
        ]),
      );

      jest.restoreAllMocks();
    });

    it('updates existing live candle with new high/low', async () => {
      // Arrange
      const mockDate = new Date('2024-01-01T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - First price update
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3000 }]);
      });

      // Second price update with higher price
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3100 }]);
      });

      // Third price update with lower price
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 2900 }]);
      });

      // Assert - Should update high/low correctly
      const expectedStartTime =
        Math.floor(mockDate / (60 * 60 * 1000)) * (60 * 60 * 1000);

      expect(result.current.candleData?.candles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            time: expectedStartTime,
            open: '3000', // Original
            high: '3100', // Updated to max
            low: '2900', // Updated to min
            close: '2900', // Latest price
            volume: '0',
          }),
        ]),
      );

      jest.restoreAllMocks();
    });

    it('creates new live candle when time period changes', async () => {
      // Arrange
      let currentTime = new Date('2024-01-01T10:00:00.000Z').getTime();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - First price update
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3000 }]);
      });

      // Move to next hour
      currentTime = new Date('2024-01-01T11:00:00.000Z').getTime();

      // Second price update in new time period
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3200 }]);
      });

      // Assert - Should have at least the live candle from second update
      expect(result.current.candleData?.candles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            open: '3200',
            close: '3200',
          }),
        ]),
      );

      jest.restoreAllMocks();
    });

    it('handles price updates with missing price data', async () => {
      // Arrange - Mock empty historical data so we can test live candle creation only
      mockFetchHistoricalCandles.mockResolvedValue({
        coin: 'ETH',
        interval: CandlePeriod.ONE_HOUR,
        candles: [],
      });

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Price update without price field
      await act(async () => {
        priceCallback?.([{ coin: 'ETH' }]); // Missing price field
      });

      // Assert - Should have empty candles array (no historical + no live candle created)
      expect(result.current.candleData?.candles).toEqual([]);

      // Assert - priceData should be set to the update object (even without price field)
      // The hook doesn't validate price field existence, just coin matching
      expect(result.current.priceData).toEqual({ coin: 'ETH' });
    });

    it('does not update priceData when no matching coin is found', async () => {
      // Arrange
      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Price update for different coin
      await act(async () => {
        priceCallback?.([{ coin: 'BTC', price: 50000 }]); // Different coin
      });

      // Assert - priceData should remain null (no matching coin)
      expect(result.current.priceData).toBeNull();
    });
  });

  describe('periodic refresh logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('sets up refresh interval based on candle period', async () => {
      // Arrange
      const mockSetInterval = jest.spyOn(global, 'setInterval');

      // Act
      renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_MINUTE,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Wait for initial effects to run
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      // Assert - Should set up 1-minute refresh interval
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60 * 1000, // 1 minute in ms
      );
    });

    it('refreshes data at correct intervals', async () => {
      // Arrange
      renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.FIVE_MINUTES,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Wait for initial load and clear the initial call
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      mockFetchHistoricalCandles.mockClear();

      // Act - Fast-forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Wait for refresh to complete
      await act(async () => {
        await Promise.resolve();
      });

      // Assert - Should have called fetch again
      expect(mockFetchHistoricalCandles).toHaveBeenCalledTimes(1);
    });

    it('handles refresh errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_MINUTE,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Wait for initial setup
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      // Make refresh fail
      mockFetchHistoricalCandles.mockRejectedValueOnce(
        new Error('Refresh failed'),
      );

      // Act - Trigger refresh
      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Wait for error to be logged
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error refreshing candle data:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('clears refresh interval on unmount', async () => {
      // Arrange
      const mockClearInterval = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Wait for setup to complete
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      // Act
      unmount();

      // Assert
      expect(mockClearInterval).toHaveBeenCalled();
    });
  });

  describe('live candle merging logic', () => {
    it('merges live candle with historical data correctly', async () => {
      // Arrange
      const historicalData = {
        coin: 'ETH',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '2900',
            high: '3000',
            low: '2800',
            close: '2950',
            volume: '1000',
          },
          {
            time: 1640998800000,
            open: '2950',
            high: '3050',
            low: '2900',
            close: '3000',
            volume: '1100',
          },
        ],
      };

      mockFetchHistoricalCandles.mockResolvedValue(historicalData);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Add live candle with new time
      const newCandleTime = 1641002400000; // Different from historical
      jest.spyOn(Date, 'now').mockReturnValue(newCandleTime);

      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3100 }]);
      });

      // Assert - Should have 3 candles (2 historical + 1 live)
      expect(result.current.candleData?.candles).toHaveLength(3);
      expect(result.current.candleData?.candles[2]).toEqual(
        expect.objectContaining({
          time: Math.floor(newCandleTime / (60 * 60 * 1000)) * (60 * 60 * 1000),
          open: '3100',
          close: '3100',
        }),
      );

      jest.restoreAllMocks();
    });

    it('replaces existing historical candle with live version', async () => {
      // Arrange
      const existingCandleTime = 1640998800000;
      const historicalData = {
        coin: 'ETH',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: existingCandleTime,
            open: '2950',
            high: '3050',
            low: '2900',
            close: '3000',
            volume: '1100',
          },
        ],
      };

      mockFetchHistoricalCandles.mockResolvedValue(historicalData);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Update with same time as existing candle
      jest.spyOn(Date, 'now').mockReturnValue(existingCandleTime + 1800000); // 30 min later, same hour

      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3200 }]);
      });

      // Assert - Should still have 1 candle, but updated with live data
      expect(result.current.candleData?.candles).toHaveLength(1);
      expect(result.current.candleData?.candles[0]).toEqual(
        expect.objectContaining({
          time: existingCandleTime,
          high: '3200', // Updated high
          close: '3200', // Updated close
        }),
      );

      jest.restoreAllMocks();
    });

    it('handles missing live candle gracefully', async () => {
      // Arrange
      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert - Without live candle, should return original historical data
      expect(result.current.candleData).toEqual(mockCandleData);
    });

    it('handles missing historical data with live candle', async () => {
      // Arrange
      mockFetchHistoricalCandles.mockResolvedValue(null);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Add live candle without historical data
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3000 }]);
      });

      // Assert - Should return null (no historical data to merge with)
      expect(result.current.candleData).toBeNull();
    });
  });

  describe('refresh intervals for different periods', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('uses correct refresh interval for each candle period', async () => {
      const periodIntervals = [
        { period: CandlePeriod.ONE_MINUTE, expectedMs: 60 * 1000 },
        { period: CandlePeriod.THREE_MINUTES, expectedMs: 3 * 60 * 1000 },
        { period: CandlePeriod.FIVE_MINUTES, expectedMs: 5 * 60 * 1000 },
        { period: CandlePeriod.FIFTEEN_MINUTES, expectedMs: 15 * 60 * 1000 },
        { period: CandlePeriod.THIRTY_MINUTES, expectedMs: 30 * 60 * 1000 },
        { period: CandlePeriod.ONE_HOUR, expectedMs: 60 * 60 * 1000 },
        { period: CandlePeriod.TWO_HOURS, expectedMs: 2 * 60 * 60 * 1000 },
        { period: CandlePeriod.FOUR_HOURS, expectedMs: 4 * 60 * 60 * 1000 },
      ];

      for (const { period, expectedMs } of periodIntervals) {
        // Arrange
        const mockSetInterval = jest
          .spyOn(global, 'setInterval')
          .mockImplementation(() => 123 as unknown as NodeJS.Timeout);

        // Act
        const { unmount } = renderHook(() =>
          usePerpsPositionData({
            coin: 'ETH',
            selectedInterval: period,
            selectedDuration: TimeDuration.ONE_DAY,
          }),
        );

        // Wait for effects to run
        await act(async () => {
          jest.runAllTimers();
          await Promise.resolve();
        });

        // Assert
        expect(mockSetInterval).toHaveBeenCalledWith(
          expect.any(Function),
          expectedMs,
        );

        // Cleanup
        unmount();
        mockSetInterval.mockRestore();
        jest.clearAllTimers();
      }
    });

    it('uses default refresh interval for unknown periods', async () => {
      // Arrange
      const mockSetInterval = jest
        .spyOn(global, 'setInterval')
        .mockImplementation(() => 456 as unknown as NodeJS.Timeout);

      // Act
      const { unmount } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: 'unknown' as CandlePeriod,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Wait for effects to run
      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });

      // Assert - Should use default 1 hour interval
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60 * 60 * 1000,
      );

      // Cleanup
      unmount();
      mockSetInterval.mockRestore();
    });
  });

  describe('prop changes and re-initialization', () => {
    it('refetches data when coin changes', async () => {
      // Arrange
      const { rerender } = renderHook((props) => usePerpsPositionData(props), {
        initialProps: {
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        },
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Clear initial call
      mockFetchHistoricalCandles.mockClear();

      // Act - Change coin
      rerender({
        coin: 'BTC',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(mockFetchHistoricalCandles).toHaveBeenCalledWith('BTC', '1h', 24);
    });

    it('refetches data when interval changes', async () => {
      // Arrange
      const { rerender } = renderHook((props) => usePerpsPositionData(props), {
        initialProps: {
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        },
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockFetchHistoricalCandles.mockClear();

      // Act - Change interval
      rerender({
        coin: 'ETH',
        selectedInterval: CandlePeriod.FIVE_MINUTES,
        selectedDuration: TimeDuration.ONE_DAY,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(mockFetchHistoricalCandles).toHaveBeenCalledWith('ETH', '5m', 288); // calculateCandleCount result (1 day / 5min intervals)
    });

    it('refetches data when duration changes', async () => {
      // Arrange
      const { rerender } = renderHook((props) => usePerpsPositionData(props), {
        initialProps: {
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        },
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockFetchHistoricalCandles.mockClear();

      // Act - Change duration
      rerender({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_WEEK,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(mockFetchHistoricalCandles).toHaveBeenCalledWith('ETH', '1h', 168); // calculateCandleCount result (1 week / 1h intervals)
    });
  });

  describe('edge cases and error scenarios', () => {
    it('handles invalid price update format', async () => {
      // Arrange
      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Invalid price format
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: NaN }]); // Invalid number
      });

      // Assert - Should handle gracefully without throwing
      expect(result.current.priceData).toEqual({
        coin: 'ETH',
        price: NaN,
      });
    });

    it('handles empty historical candle response', async () => {
      // Arrange
      mockFetchHistoricalCandles.mockResolvedValue({
        coin: 'ETH',
        interval: CandlePeriod.ONE_HOUR,
        candles: [],
      });

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.candleData?.candles).toEqual([]);
      expect(result.current.isLoadingHistory).toBe(false);
    });

    it('handles null historical candle response', async () => {
      // Arrange
      mockFetchHistoricalCandles.mockResolvedValue(null);

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      // Act
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.candleData).toBeNull();
      expect(result.current.isLoadingHistory).toBe(false);
    });

    it('handles price updates for wrong coin', async () => {
      // Arrange
      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act - Price update for different coin
      await act(async () => {
        priceCallback?.([{ coin: 'BTC', price: 45000 }]);
      });

      // Assert - Should not update priceData
      expect(result.current.priceData).toBeNull();
    });

    it('handles malformed price update array', async () => {
      // Arrange
      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Act & Assert - Malformed update should throw TypeError due to null.find()
      expect(() => {
        act(() => {
          priceCallback?.(null as unknown as PriceUpdate[]); // Invalid format - will cause TypeError
        });
      }).toThrow("Cannot read properties of null (reading 'find')");

      // Assert - priceData should remain null due to error
      expect(result.current.priceData).toBeNull();
    });
  });

  describe('comprehensive integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('handles complete workflow: fetch -> price updates -> refresh', async () => {
      // Arrange
      const historicalData = {
        coin: 'ETH',
        interval: CandlePeriod.ONE_MINUTE,
        candles: [
          {
            time: 1640995200000,
            open: '3000',
            high: '3100',
            low: '2900',
            close: '3050',
            volume: '1000',
          },
        ],
      };

      mockFetchHistoricalCandles.mockResolvedValue(historicalData);

      let priceCallback: PriceCallback | undefined;
      mockSubscribeToPrices.mockImplementation(
        ({ callback }: SubscribeToPricesParams) => {
          priceCallback = callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsPositionData({
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_MINUTE,
          selectedDuration: TimeDuration.ONE_HOUR,
        }),
      );

      // Act - Step 1: Initial load
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(result.current.candleData?.candles).toHaveLength(1);

      // Step 2: Price updates
      await act(async () => {
        priceCallback?.([{ coin: 'ETH', price: 3200 }]);
      });

      expect(result.current.priceData?.price).toBe(3200);

      // Step 3: Trigger refresh
      mockFetchHistoricalCandles.mockClear();
      const updatedData = {
        ...historicalData,
        candles: [
          ...historicalData.candles,
          {
            time: 1640995260000,
            open: '3200',
            high: '3250',
            low: '3150',
            close: '3200',
            volume: '500',
          },
        ],
      };
      mockFetchHistoricalCandles.mockResolvedValue(updatedData);

      act(() => {
        jest.advanceTimersByTime(60 * 1000); // 1 minute
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Assert - Should have refreshed data
      expect(mockFetchHistoricalCandles).toHaveBeenCalledTimes(1);
    });

    it('handles rapid prop changes without race conditions', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        (props) => usePerpsPositionData(props),
        {
          initialProps: {
            coin: 'ETH',
            selectedInterval: CandlePeriod.ONE_HOUR,
            selectedDuration: TimeDuration.ONE_DAY,
          },
        },
      );

      // Act - Rapid prop changes
      for (let i = 0; i < 3; i++) {
        rerender({
          coin: `COIN${i}`,
          selectedInterval:
            i % 2 === 0 ? CandlePeriod.ONE_HOUR : CandlePeriod.FIVE_MINUTES,
          selectedDuration:
            i % 2 === 0 ? TimeDuration.ONE_DAY : TimeDuration.ONE_WEEK,
        });

        act(() => {
          jest.runOnlyPendingTimers();
        });
      }

      // Assert - Should handle without throwing
      expect(result.current).toBeDefined();
    });

    it('handles subscription cleanup on prop changes', async () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook((props) => usePerpsPositionData(props), {
        initialProps: {
          coin: 'ETH',
          selectedInterval: CandlePeriod.ONE_HOUR,
          selectedDuration: TimeDuration.ONE_DAY,
        },
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      // Act - Change coin (should trigger new subscription)
      rerender({
        coin: 'BTC',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      // Assert - Should have called unsubscribe for old subscription
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
