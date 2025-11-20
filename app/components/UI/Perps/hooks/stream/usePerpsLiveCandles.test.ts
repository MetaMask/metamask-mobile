import { renderHook, act } from '@testing-library/react-native';
import { usePerpsLiveCandles } from './usePerpsLiveCandles';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import type { CandleData } from '../../types/perps-types';

// Mock the stream provider
const mockCandleSubscribe = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    candles: {
      subscribe: mockCandleSubscribe,
    },
  })),
}));

// Mock DevLogger to suppress logs in tests
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

describe('usePerpsLiveCandles', () => {
  const mockCandleData: CandleData = {
    coin: 'BTC',
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
  });

  it('subscribes to candles on mount', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    renderHook(() =>
      usePerpsLiveCandles({
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    expect(mockCandleSubscribe).toHaveBeenCalledWith({
      coin: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
    });
  });

  it('unsubscribes on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() =>
      usePerpsLiveCandles({
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('resubscribes when coin changes', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(
      ({ coin }) =>
        usePerpsLiveCandles({
          coin,
          interval: CandlePeriod.ONE_HOUR,
          duration: TimeDuration.ONE_DAY,
        }),
      {
        initialProps: { coin: 'BTC' },
      },
    );

    expect(mockCandleSubscribe).toHaveBeenCalledTimes(1);

    // Change coin
    rerender({ coin: 'ETH' });

    // Should unsubscribe from old and subscribe to new
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockCandleSubscribe).toHaveBeenCalledTimes(2);
    expect(mockCandleSubscribe).toHaveBeenLastCalledWith({
      coin: 'ETH',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
    });
  });

  it('resubscribes when interval changes', () => {
    const mockUnsubscribe = jest.fn();
    mockCandleSubscribe.mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(
      ({ interval }) =>
        usePerpsLiveCandles({
          coin: 'BTC',
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
      coin: 'BTC',
      interval: CandlePeriod.FIVE_MINUTES,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
    });
  });

  it('handles empty coin gracefully', () => {
    mockCandleSubscribe.mockReturnValue(jest.fn());

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        coin: '',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    // Empty coin returns stable empty data object, not null
    expect(result.current.candleData).toEqual({
      coin: '',
      interval: CandlePeriod.ONE_HOUR,
      candles: [],
    });
    expect(result.current.isLoading).toBe(false);
    expect(mockCandleSubscribe).not.toHaveBeenCalled();
  });

  it('rejects updates with mismatched coin', async () => {
    let capturedCallback: (data: CandleData) => void = jest.fn();
    mockCandleSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLiveCandles({
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    // Send update for wrong coin
    const wrongCoinData: CandleData = {
      ...mockCandleData,
      coin: 'ETH',
    };

    act(() => {
      capturedCallback(wrongCoinData);
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
        coin: 'BTC',
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
        coin: 'BTC',
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
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        duration: TimeDuration.ONE_DAY,
      }),
    );

    expect(mockCandleSubscribe).toHaveBeenCalledWith({
      coin: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      duration: TimeDuration.ONE_DAY,
      callback: expect.any(Function),
      throttleMs: 1000,
    });
  });
});
