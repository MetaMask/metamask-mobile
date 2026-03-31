import { renderHook, act } from '@testing-library/react-native';
import { useRefetchCandleDataOnError } from './useRefetchCandleDataOnError';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';

describe('useRefetchCandleDataOnError', () => {
  const makeCandleData = (candles: CandleData['candles'] = []): CandleData => ({
    symbol: 'BTC',
    interval: CandlePeriod.OneHour,
    candles,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not retry when there is no error', () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: null,
        candleError: null,
        fetchMoreHistory,
      }),
    );

    jest.advanceTimersByTime(60_000);

    expect(fetchMoreHistory).not.toHaveBeenCalled();
  });

  it('does not retry for non-rate-limit errors', () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: null,
        candleError: new Error('Network timeout'),
        fetchMoreHistory,
      }),
    );

    jest.advanceTimersByTime(60_000);

    expect(fetchMoreHistory).not.toHaveBeenCalled();
  });

  it('retries on "too many requests" error', async () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: null,
        candleError: new Error('Too many requests'),
        fetchMoreHistory,
      }),
    );

    // First retry fires after 5s
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(fetchMoreHistory).toHaveBeenCalledTimes(1);

    // Second retry after another 5s
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(fetchMoreHistory).toHaveBeenCalledTimes(2);
  });

  it('stops retrying once candles arrive', async () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      (props) => useRefetchCandleDataOnError(props),
      {
        initialProps: {
          candleData: null as CandleData | null,
          candleError: new Error('Too many requests') as Error | null,
          fetchMoreHistory,
        },
      },
    );

    // First retry
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(fetchMoreHistory).toHaveBeenCalledTimes(1);

    // Simulate candles arriving via ref update
    const withCandles = makeCandleData([
      {
        time: 1700000000000,
        open: '50000',
        high: '51000',
        low: '49000',
        close: '50500',
        volume: '100',
      },
    ]);
    rerender({
      candleData: withCandles,
      candleError: new Error('Too many requests'),
      fetchMoreHistory,
    });

    // More time passes but no more retries since candles are present
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(fetchMoreHistory).toHaveBeenCalledTimes(1);
  });

  it('stops retrying after max retries (12)', async () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: null,
        candleError: new Error('too many requests'),
        fetchMoreHistory,
      }),
    );

    // Advance through all 12 retries (12 * 5s = 60s)
    for (let i = 0; i < 12; i++) {
      await act(async () => {
        jest.advanceTimersByTime(5_000);
      });
    }

    expect(fetchMoreHistory).toHaveBeenCalledTimes(12);

    // Advance more - no additional retries
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(fetchMoreHistory).toHaveBeenCalledTimes(12);
  });

  it('stops retrying on unmount', async () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: null,
        candleError: new Error('Too many requests'),
        fetchMoreHistory,
      }),
    );

    // First retry
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(fetchMoreHistory).toHaveBeenCalledTimes(1);

    unmount();

    // More time passes but no more retries since unmounted
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(fetchMoreHistory).toHaveBeenCalledTimes(1);
  });

  it('matches "too many requests" case-insensitively', async () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: null,
        candleError: new Error('TOO MANY REQUESTS'),
        fetchMoreHistory,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(fetchMoreHistory).toHaveBeenCalledTimes(1);
  });

  it('does not retry when candles already exist', () => {
    const fetchMoreHistory = jest.fn().mockResolvedValue(undefined);
    const existingData = makeCandleData([
      {
        time: 1700000000000,
        open: '50000',
        high: '51000',
        low: '49000',
        close: '50500',
        volume: '100',
      },
    ]);

    renderHook(() =>
      useRefetchCandleDataOnError({
        candleData: existingData,
        candleError: new Error('Too many requests'),
        fetchMoreHistory,
      }),
    );

    jest.advanceTimersByTime(60_000);

    // fetchMoreHistory gets called but the retry loop checks the ref
    // and stops immediately because candles.length > 0
    expect(fetchMoreHistory).toHaveBeenCalledTimes(0);
  });
});
