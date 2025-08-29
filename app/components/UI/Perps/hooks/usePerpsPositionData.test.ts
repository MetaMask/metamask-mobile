import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsPositionData } from './usePerpsPositionData';
import Engine from '../../../../core/Engine';
import { CandlePeriod, TimeDuration } from '../constants/chartConfig';

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
  const mockUnsubscribe = jest.fn();

  const mockCandleData = {
    candles: [
      { time: 1234567890, open: 3000, high: 3100, low: 2900, close: 3050 },
    ],
  };

  const mockPriceUpdate = {
    coin: 'ETH',
    price: '3000.00',
    change24h: 2.5,
    markPrice: '3001.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHistoricalCandles.mockResolvedValue(mockCandleData);
    mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);
  });

  it('should fetch historical candles on mount', async () => {
    const { waitForNextUpdate } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    await waitForNextUpdate();

    expect(mockFetchHistoricalCandles).toHaveBeenCalledWith('ETH', '1h', 24);
  });

  it('should subscribe to price updates on mount', () => {
    renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    expect(mockSubscribeToPrices).toHaveBeenCalledWith({
      symbols: ['ETH'],
      callback: expect.any(Function),
    });
  });

  it('should update price data when receiving updates', async () => {
    const { result } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    // Get the callback that was passed to subscribeToPrices
    const callback = mockSubscribeToPrices.mock.calls[0][0].callback;

    // Trigger price update
    act(() => {
      callback([mockPriceUpdate]);
    });

    expect(result.current.priceData).toEqual(mockPriceUpdate);
  });

  it('should handle loading state correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    // Initially loading
    expect(result.current.isLoadingHistory).toBe(true);

    // Wait for historical data to load
    await waitForNextUpdate();

    expect(result.current.isLoadingHistory).toBe(false);
    expect(result.current.candleData).toEqual(mockCandleData);
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle errors in fetching historical data', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetchHistoricalCandles.mockRejectedValue(new Error('Failed to fetch'));

    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsPositionData({
        coin: 'ETH',
        selectedInterval: CandlePeriod.ONE_HOUR,
        selectedDuration: TimeDuration.ONE_DAY,
      }),
    );

    await waitForNextUpdate();

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
});
