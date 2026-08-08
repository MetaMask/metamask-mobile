import { act, renderHook } from '@testing-library/react-native';
import { useCurrentPredictMarketFromSeries } from './useCurrentPredictMarketFromSeries';
import { usePredictSeries } from './usePredictSeries';
import { Recurrence, type PredictMarket, type PredictSeries } from '../types';

jest.mock('./usePredictSeries', () => ({
  usePredictSeries: jest.fn(),
}));

const mockUsePredictSeries = usePredictSeries as jest.Mock;

const SERIES: PredictSeries = {
  id: 'btc-series',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down',
  recurrence: '5m',
};

const createMarket = (
  id: string,
  endDate: string,
): PredictMarket & { series: PredictSeries } =>
  ({
    id,
    providerId: 'polymarket',
    slug: id,
    title: id,
    description: id,
    image: '',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: ['crypto', 'up-or-down', 'bitcoin'],
    outcomes: [],
    liquidity: 0,
    volume: 0,
    endDate,
    series: SERIES,
  }) as PredictMarket & { series: PredictSeries };

describe('useCurrentPredictMarketFromSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:03:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches the current series window and exposes the live market', () => {
    const liveMarket = createMarket('live-market', '2026-01-01T00:05:00.000Z');
    mockUsePredictSeries.mockReturnValue({
      data: [liveMarket],
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useCurrentPredictMarketFromSeries({ series: SERIES }),
    );

    expect(mockUsePredictSeries).toHaveBeenCalledWith(
      {
        seriesId: SERIES.id,
        endDateMin: '2025-12-31T23:45:00.000Z',
        endDateMax: '2026-01-01T00:50:00.000Z',
      },
      { enabled: true },
    );
    expect(result.current.marketId).toBe('live-market');
    expect(result.current.market).toEqual(liveMarket);
  });

  it('does not fetch without a series id', () => {
    mockUsePredictSeries.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    renderHook(() => useCurrentPredictMarketFromSeries({ enabled: true }));

    expect(mockUsePredictSeries).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: '' }),
      { enabled: false },
    );
  });

  it('schedules window updates at the next boundary instead of polling every second', () => {
    mockUsePredictSeries.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    renderHook(() => useCurrentPredictMarketFromSeries({ series: SERIES }));

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalled();
    const longestDelay = setTimeoutSpy.mock.calls
      .map((call) => Number(call[1]))
      .reduce((max, value) => (value > max ? value : max), 0);
    expect(longestDelay).toBeGreaterThan(1_000);
    expect(longestDelay).toBeLessThanOrEqual(5 * 60 * 1000);

    setTimeoutSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  it('reschedules the next boundary after firing', () => {
    mockUsePredictSeries.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    renderHook(() => useCurrentPredictMarketFromSeries({ series: SERIES }));

    const initialPending = jest.getTimerCount();
    expect(initialPending).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it('clears the pending boundary timeout on unmount', () => {
    mockUsePredictSeries.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    const { unmount } = renderHook(() =>
      useCurrentPredictMarketFromSeries({ series: SERIES }),
    );

    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
