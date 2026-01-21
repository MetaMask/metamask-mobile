import { renderHook, act } from '@testing-library/react-native';
import { usePerpsLiveCandles } from './usePerpsLiveCandles';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import type { CandleData } from '../../types/perps-types';

// Mock the stream provider
const mockCandleSubscribe = jest.fn();
const mockFetchHistoricalCandles = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    candles: {
      subscribe: mockCandleSubscribe,
      fetchHistoricalCandles: mockFetchHistoricalCandles,
    },
  })),
}));

// Mock DevLogger to suppress logs in tests
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

describe('usePerpsLiveCandles', () => {
  const mockCandleData: CandleData = {
    symbol: 'BTC',
    interval: CandlePeriod.ONE_HOUR,
    candles: [
      {
        time: 1700000000000,
        open: '50000',
        high: '51000',
        low: '49000',
        close: '50500',
        volume: '100',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHistoricalCandles.mockReset();
  });

  it('subscribes to candles on mount', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    expect(mockCandleSubscribe).toHaveBeenCalledWith({
      symbol: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
      onError: expect.any(Function),
    });
  });

  it('unsubscribes on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('resubscribes when symbol changes', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(
      ({ symbol }) =>
        usePerpsLiveCandles({
          symbol,
          interval: CandlePeriod.ONE_HOUR,
          duration: TimeDuration.ONE_DAY,
        }),
      {
        initialProps: { symbol: 'BTC' },
      },
    );

    expect(mockCandleSubscribe).toHaveBeenCalledTimes(1);

    // Change symbol
    rerender({ symbol: 'ETH' });

    // Should unsubscribe from old and subscribe to new
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockCandleSubscribe).toHaveBeenCalledTimes(2);
    expect(mockCandleSubscribe).toHaveBeenLastCalledWith({
      symbol: 'ETH',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
      onError: expect.any(Function),
    });
  });

  it('resubscribes when interval changes', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(
      ({ interval }) =>
        usePerpsLiveCandles({
          symbol: 'BTC',
          interval,
          duration: TimeDuration.ONE_DAY,
        }),
      {
        initialProps: { interval: CandlePeriod.ONE_HOUR },
      },
    );

    expect(mockCandleSubscribe).toHaveBeenCalledTimes(1);

    // Change interval
    rerender({ interval: CandlePeriod.FIVE_MINUTES });

    // Should resubscribe
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockCandleSubscribe).toHaveBeenCalledTimes(2);
    expect(mockCandleSubscribe).toHaveBeenLastCalledWith({
      symbol: 'BTC',
      interval: CandlePeriod.FIVE_MINUTES,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
      onError: expect.any(Function),
    });
  });

  it('handles empty symbol gracefully', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: '',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    // Empty symbol returns stable empty data object, not null
    expect(result.current.candleData).toEqual({
      symbol: '',
      interval: CandlePeriod.ONE_HOUR,
      candles: [],
    });
    expect(result.current.isLoading).toBe(false);
    expect(mockCandleSubscribe).not.toHaveBeenCalled();
  });

  it('rejects updates with mismatched symbol', async () => {
    let capturedCallback: (data: CandleData) => void = jest.fn();
    mockCandleSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    // Send update for wrong symbol
    const wrongSymbolData: CandleData = {
      ...mockCandleData,
      symbol: 'ETH',
    };

    act(() => {
      capturedCallback(wrongSymbolData);
    });

    // Should not update
    expect(result.current.candleData).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('rejects updates with mismatched interval', async () => {
    let capturedCallback: (data: CandleData) => void = jest.fn();
    mockCandleSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    // Send update for wrong interval
    const wrongIntervalData: CandleData = {
      ...mockCandleData,
      interval: CandlePeriod.FIVE_MINUTES,
    };

    act(() => {
      capturedCallback(wrongIntervalData);
    });

    // Should not update
    expect(result.current.candleData).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('ignores null or undefined updates', () => {
    let capturedCallback: (data: CandleData) => void = jest.fn();
    mockCandleSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    // Send null
    act(() => {
      capturedCallback(null as unknown as CandleData);
    });

    // Should not update state
    expect(result.current.candleData).toBeNull();
    expect(result.current.isLoading).toBe(true);

    // Send undefined
    act(() => {
      capturedCallback(undefined as unknown as CandleData);
    });

    // Should not update state
    expect(result.current.candleData).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('uses default throttle of 1000ms', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    expect(mockCandleSubscribe).toHaveBeenCalledWith({
      symbol: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
      onError: expect.any(Function),
    });
  });

  it('resets state when symbol changes', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    const { result, rerender } = renderHook(
      ({ symbol }) =>
        usePerpsLiveCandles({
          symbol,
          interval: CandlePeriod.ONE_HOUR,
          duration: TimeDuration.ONE_DAY,
        }),
      {
        initialProps: { symbol: 'BTC' },
      },
    );

    // Verify initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.candleData).toBeNull();

    rerender({ symbol: 'ETH' });

    // State should be reset for new symbol
    expect(result.current.isLoading).toBe(true);
    expect(result.current.candleData).toBeNull();
  });

  it('resets state when interval changes', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    const { result, rerender } = renderHook(
      ({ interval }) =>
        usePerpsLiveCandles({
          symbol: 'BTC',
          interval,
          duration: TimeDuration.ONE_DAY,
        }),
      {
        initialProps: { interval: CandlePeriod.ONE_HOUR },
      },
    );

    // Verify initial state
    expect(result.current.isLoading).toBe(true);

    rerender({ interval: CandlePeriod.FIVE_MINUTES });

    // State should be reset for new interval
    expect(result.current.isLoading).toBe(true);
    expect(result.current.candleData).toBeNull();
  });

  it('resubscribes when duration changes', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(
      ({ duration }) =>
        usePerpsLiveCandles({
          symbol: 'BTC',
          interval: CandlePeriod.ONE_HOUR,
          duration,
        }),
      {
        initialProps: { duration: TimeDuration.ONE_DAY },
      },
    );

    expect(mockCandleSubscribe).toHaveBeenCalledTimes(1);

    rerender({ duration: TimeDuration.ONE_WEEK });

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockCandleSubscribe).toHaveBeenCalledTimes(2);
    expect(mockCandleSubscribe).toHaveBeenLastCalledWith({
      symbol: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_WEEK,
      callback: expect.any(Function),
      throttleMs: 1000,
      onError: expect.any(Function),
    });
  });

  it('passes custom throttleMs to subscription', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
        throttleMs: 2000,
      }),
    );

    expect(mockCandleSubscribe).toHaveBeenCalledWith({
      symbol: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 2000,
      onError: expect.any(Function),
    });
  });

  it('handles subscription error gracefully', () => {
    const subscriptionError = new Error('WebSocket connection failed');
    mockCandleSubscribe.mockImplementation(() => {
      throw subscriptionError;
    });

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    expect(result.current.error).toEqual(subscriptionError);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.candleData).toBeNull();
  });

  it('does not fetch more history when symbol is empty', async () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: '',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    await act(async () => {
      await result.current.fetchMoreHistory();
    });

    expect(mockFetchHistoricalCandles).not.toHaveBeenCalled();
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('fetches more historical candles successfully', async () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());
    mockFetchHistoricalCandles.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    await act(async () => {
      await result.current.fetchMoreHistory();
    });

    expect(mockFetchHistoricalCandles).toHaveBeenCalledWith(
      'BTC',
      CandlePeriod.ONE_HOUR,
      TimeDuration.ONE_DAY,
    );
  });

  it('sets isLoadingMore during fetch', async () => {
    let resolvePromise: (() => void) | undefined;
    const fetchPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    mockCandleSubscribe.mockReturnValue(jest.fn());
    mockFetchHistoricalCandles.mockReturnValue(fetchPromise);

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        symbol: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    let fetchPromiseFromHook: Promise<void> | undefined;

    act(() => {
      fetchPromiseFromHook = result.current.fetchMoreHistory();
    });

    expect(result.current.isLoadingMore).toBe(true);

    await act(async () => {
      if (resolvePromise) {
        resolvePromise();
      }
      if (fetchPromiseFromHook) {
        await fetchPromiseFromHook;
      }
    });

    expect(result.current.isLoadingMore).toBe(false);
  });
});
