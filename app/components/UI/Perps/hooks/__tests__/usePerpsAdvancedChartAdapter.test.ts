import { renderHook, act } from '@testing-library/react-hooks';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
} from '@metamask/perps-controller';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type { FetchOlderBarsRequest } from '../../../Charts/AdvancedChart/AdvancedChart.types';
import {
  convertCandlesToOHLCVBars,
  INTERVAL_MS,
  PREWARM_CANDLE_PERIODS,
  usePerpsAdvancedChartAdapter,
} from '../usePerpsAdvancedChartAdapter';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

type TestCandle = CandleData['candles'][number];

describe('convertCandlesToOHLCVBars', () => {
  it('converts valid string-typed candles to numeric OHLCVBars', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '500',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      time: 1000000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 500,
    });
  });

  it('uses 0 for volume when volume field is absent', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
      } as unknown as TestCandle,
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result[0].volume).toBe(0);
  });

  it('drops bars with non-finite OHLC values', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: 'NaN',
        high: '110',
        low: '90',
        close: '105',
        volume: '100',
      },
      {
        time: 2000000,
        open: 'invalid',
        high: '110',
        low: '90',
        close: '105',
        volume: '100',
      },
      {
        time: 3000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '200',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(3000000);
  });

  it('returns empty array for empty candles', () => {
    expect(convertCandlesToOHLCVBars([])).toEqual([]);
  });

  it('preserves millisecond timestamps without multiplication', () => {
    const candles: TestCandle[] = [
      {
        time: 1_700_000_000_000,
        open: '42000',
        high: '43000',
        low: '41000',
        close: '42500',
        volume: '1000',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result[0].time).toBe(1_700_000_000_000);
  });
});

describe('INTERVAL_MS', () => {
  it('has correct millisecond values for key intervals', () => {
    expect(INTERVAL_MS['1m']).toBe(60_000);
    expect(INTERVAL_MS['1h']).toBe(3_600_000);
    expect(INTERVAL_MS['4h']).toBe(14_400_000);
    expect(INTERVAL_MS['1d']).toBe(86_400_000);
    expect(INTERVAL_MS['1w']).toBe(604_800_000);
  });
});

describe('usePerpsAdvancedChartAdapter loading lifecycle', () => {
  const mockSubscribe = jest.fn();
  const mockFetchHistoricalCandles = jest.fn();
  const mockPrewarmCandles = jest.fn();

  const SYMBOL = 'BTC';
  const INTERVAL = CandlePeriod.OneHour;

  const renderAdapter = (
    overrides: Partial<Parameters<typeof usePerpsAdvancedChartAdapter>[0]> = {},
  ) =>
    renderHook(() =>
      usePerpsAdvancedChartAdapter({
        symbol: SYMBOL,
        interval: INTERVAL,
        visibleCandleCount: 45,
        ...overrides,
      }),
    );

  /** The params object passed into stream.candles.subscribe for the current mount. */
  const subscribeParams = (callIndex = 0) =>
    mockSubscribe.mock.calls[callIndex][0];

  const fetchOlderRequest = (
    overrides: Partial<FetchOlderBarsRequest> = {},
  ): FetchOlderBarsRequest => ({
    requestId: 'older-1',
    seriesGeneration: 1,
    symbol: SYMBOL,
    resolution: '60',
    fromSec: 1,
    toSec: 2,
    oldestLoadedTimeMs: 2500,
    ...overrides,
  });

  const candle = (time: number): TestCandle => ({
    time,
    open: '100',
    high: '110',
    low: '90',
    close: '105',
    volume: '500',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue(jest.fn());
    mockFetchHistoricalCandles.mockResolvedValue(undefined);
    mockPrewarmCandles.mockResolvedValue(undefined);
    (usePerpsStream as jest.Mock).mockReturnValue({
      candles: {
        subscribe: mockSubscribe,
        fetchHistoricalCandles: mockFetchHistoricalCandles,
        prewarmCandles: mockPrewarmCandles,
      },
    });
  });

  it('starts in the loading state until the first delivery', () => {
    const { result } = renderAdapter();
    expect(result.current.isLoading).toBe(true);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('prewarms common candle periods for the active symbol', () => {
    renderAdapter();

    expect(mockPrewarmCandles).toHaveBeenCalledTimes(
      PREWARM_CANDLE_PERIODS.length,
    );
    PREWARM_CANDLE_PERIODS.forEach((period) => {
      expect(mockPrewarmCandles).toHaveBeenCalledWith(
        SYMBOL,
        period,
        TimeDuration.OneWeek,
      );
    });
  });

  it('skips prewarming when the stream does not expose prewarmCandles', () => {
    (usePerpsStream as jest.Mock).mockReturnValue({
      candles: {
        subscribe: mockSubscribe,
        fetchHistoricalCandles: mockFetchHistoricalCandles,
      },
    });

    renderAdapter();

    expect(mockPrewarmCandles).not.toHaveBeenCalled();
  });

  it('logs prewarm failures without blocking the subscription', async () => {
    mockPrewarmCandles
      .mockRejectedValueOnce(new Error('prewarm down'))
      .mockResolvedValue(undefined);

    renderAdapter();
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      'usePerpsAdvancedChartAdapter: prewarm failed',
      expect.objectContaining({
        symbol: SYMBOL,
        interval: PREWARM_CANDLE_PERIODS[0],
        error: 'prewarm down',
      }),
    );
  });

  it('clears isLoading on the first delivery even when the frame is empty (regression: no hang)', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [],
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.ohlcvData).toEqual([]);
  });

  it('clears isLoading and populates ohlcvData on the first valid delivery', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.ohlcvData).toHaveLength(1);
  });

  it('keeps previous candles visible during interval refresh and replaces them when fresh data arrives', () => {
    const { result, rerender } = renderHook(
      ({ interval }) =>
        usePerpsAdvancedChartAdapter({
          symbol: SYMBOL,
          interval,
          visibleCandleCount: 45,
        }),
      { initialProps: { interval: INTERVAL } },
    );

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000), candle(2000)],
      });
    });

    const previousBars = result.current.ohlcvData;
    expect(result.current.isLoading).toBe(false);
    expect(previousBars).toEqual([
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
      { time: 2000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
    ]);

    rerender({ interval: CandlePeriod.FourHours });

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.ohlcvData).toBe(previousBars);

    act(() => {
      subscribeParams(1).callback({
        symbol: SYMBOL,
        interval: CandlePeriod.FourHours,
        candles: [candle(4000), candle(8000)],
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.ohlcvData).toEqual([
      { time: 4000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
      { time: 8000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
    ]);
    const fourHourIntervalMs = INTERVAL_MS[CandlePeriod.FourHours];
    if (fourHourIntervalMs === undefined) {
      throw new Error('Expected 4h interval duration to be defined');
    }

    expect(result.current.visibleToMs).toBe(8000);
    expect(result.current.visibleFromMs).toBe(8000 - fourHourIntervalMs * 45);
  });

  it('clears isLoading when the subscription reports an error', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().onError?.(new Error('ws failed'));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('ignores stale deliveries (mismatched symbol) and stays loading', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: 'ETH',
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.ohlcvData).toEqual([]);
  });

  it('ignores stale deliveries with mismatched interval and stays loading', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: CandlePeriod.FiveMinutes,
        candles: [candle(1000)],
      });
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.ohlcvData).toEqual([]);
  });

  it('emits realtimeBar when the latest candle values change', () => {
    const { result } = renderAdapter();
    const updated = { ...candle(1000), close: '106' };

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });
    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [updated],
      });
    });

    expect(result.current.ohlcvData).toEqual([
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
    ]);
    expect(result.current.realtimeBar).toEqual({
      time: 1000,
      open: 100,
      high: 110,
      low: 90,
      close: 106,
      volume: 500,
    });
  });

  it('emits realtimeBar when only the latest candle volume changes', () => {
    const { result } = renderAdapter();
    const updated = { ...candle(1000), volume: '750' };

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });
    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [updated],
      });
    });

    expect(result.current.ohlcvData).toEqual([
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
    ]);
    expect(result.current.realtimeBar).toEqual({
      time: 1000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 750,
    });
  });

  it('skips realtimeBar when the latest candle has not changed', () => {
    const { result } = renderAdapter();
    const first = candle(1000);

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [first],
      });
    });
    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [first],
      });
    });

    expect(result.current.realtimeBar).toBeUndefined();
  });

  it('emits realtimeBar when a new latest candle arrives', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });
    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000), candle(2000)],
      });
    });

    expect(result.current.realtimeBar?.time).toBe(2000);
  });

  it('returns older bars for handleFetchOlderBarsRequest', async () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000), candle(2000), candle(3000)],
      });
    });
    const response =
      await result.current.handleFetchOlderBarsRequest(fetchOlderRequest());

    expect(mockFetchHistoricalCandles).toHaveBeenCalledWith(
      SYMBOL,
      INTERVAL,
      TimeDuration.OneWeek,
    );
    expect(response).toEqual({
      requestId: 'older-1',
      seriesGeneration: 1,
      bars: [
        { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
        { time: 2000, open: 100, high: 110, low: 90, close: 105, volume: 500 },
      ],
      noData: false,
    });
  });

  it('uses the configured duration when fetching older bars', async () => {
    const { result } = renderAdapter({
      paginationDuration: TimeDuration.YearToDate,
    });

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000), candle(2000), candle(3000)],
      });
    });
    await result.current.handleFetchOlderBarsRequest(fetchOlderRequest());

    expect(mockFetchHistoricalCandles).toHaveBeenCalledWith(
      SYMBOL,
      INTERVAL,
      TimeDuration.YearToDate,
    );
  });

  it('returns noData when handleFetchOlderBarsRequest finds no older bars', async () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });
    const response = await result.current.handleFetchOlderBarsRequest(
      fetchOlderRequest({ oldestLoadedTimeMs: 500 }),
    );

    expect(response).toEqual({
      requestId: 'older-1',
      seriesGeneration: 1,
      bars: [],
      noData: true,
    });
  });

  it('returns noData with error text when historical fetch resolves before candle data arrives', async () => {
    const { result } = renderAdapter();

    const response =
      await result.current.handleFetchOlderBarsRequest(fetchOlderRequest());

    expect(response).toEqual({
      requestId: 'older-1',
      seriesGeneration: 1,
      bars: [],
      noData: true,
      error: 'Error: no candle data after fetch',
    });
  });

  it('returns noData with error text when historical fetch fails', async () => {
    mockFetchHistoricalCandles.mockRejectedValueOnce(new Error('history down'));
    const { result } = renderAdapter();

    const response =
      await result.current.handleFetchOlderBarsRequest(fetchOlderRequest());

    expect(response).toEqual({
      requestId: 'older-1',
      seriesGeneration: 1,
      bars: [],
      noData: true,
      error: 'Error: history down',
    });
  });
});
