import { act, renderHook } from '@testing-library/react-native';
import { useHomepageSparklines } from './useHomepageSparklines';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
  type PerpsMarketData,
} from '@metamask/perps-controller';

const mockSubscribe = jest.fn();
const mockPrewarmCandles = jest.fn().mockResolvedValue(undefined);
const mockStream = {
  candles: {
    prewarmCandles: mockPrewarmCandles,
    subscribe: mockSubscribe,
  },
};

jest.mock('../../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => mockStream),
}));

function makeMarket(
  symbol: string,
  trend?: [number, string][],
): PerpsMarketData {
  return {
    symbol,
    name: symbol,
    maxLeverage: '10x',
    price: '$100.00',
    change24h: '$0.00',
    change24hPercent: '0.00%',
    volume: '$0',
    ...(trend !== undefined && { trend }),
  } as PerpsMarketData;
}

function makeTrend(count: number, prices?: number[]): [number, string][] {
  return Array.from({ length: count }, (_, i) => [
    1700000000000 + i * 3_600_000,
    String(prices?.[i] ?? 100 + i),
  ]);
}

function makeCandles(count: number, startPrice = 100): CandleData['candles'] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1700000000000 + i * 900_000,
    open: '100',
    high: '110',
    low: '90',
    close: String(startPrice + i),
    volume: '50',
  }));
}

describe('useHomepageSparklines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue(jest.fn());
  });

  it('builds sparklines from market trend data', () => {
    const markets = [
      makeMarket('BTC', makeTrend(60)),
      makeMarket('ETH', makeTrend(60)),
    ];

    const { result } = renderHook(() => useHomepageSparklines(markets));

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.BTC.length).toBe(50);
    expect(result.current.sparklines.ETH).toBeDefined();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('returns an empty sparklines map for an empty markets array', () => {
    const { result } = renderHook(() => useHomepageSparklines([]));

    expect(result.current.sparklines).toEqual({});
  });

  it('returns the same object when markets are unchanged', () => {
    const markets = [makeMarket('BTC', makeTrend(10))];
    const { result, rerender } = renderHook(
      ({ m }) => useHomepageSparklines(m),
      { initialProps: { m: markets } },
    );
    const initialResult = result.current;

    rerender({ m: markets });

    expect(result.current).toBe(initialResult);
  });

  it('skips markets with fewer than 2 trend points', () => {
    const markets = [makeMarket('BTC', makeTrend(1))];

    const { result } = renderHook(() => useHomepageSparklines(markets));

    expect(result.current.sparklines.BTC).toBeUndefined();
  });

  it('falls back to candle data when trend is unavailable', async () => {
    mockSubscribe.mockImplementation(
      (params: { callback: (candleData: CandleData) => void }) => {
        params.callback({
          symbol: 'BTC',
          interval: CandlePeriod.FifteenMinutes,
          candles: makeCandles(60),
        });
        return jest.fn();
      },
    );
    const markets = [makeMarket('BTC')];

    const { result } = renderHook(() => useHomepageSparklines(markets));
    await act(async () => undefined);

    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
      }),
    );
    expect(result.current.sparklines.BTC).toHaveLength(50);
  });

  it('subscribes only for markets whose trend is missing', () => {
    const markets = [makeMarket('BTC', makeTrend(10)), makeMarket('ETH')];

    renderHook(() => useHomepageSparklines(markets));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETH' }),
    );
  });

  it('keeps the last fallback data when a refresh returns no candles', async () => {
    let callback: ((candleData: CandleData) => void) | undefined;
    mockSubscribe.mockImplementation(
      (params: { callback: (candleData: CandleData) => void }) => {
        callback = params.callback;
        return jest.fn();
      },
    );

    const { result } = renderHook(() =>
      useHomepageSparklines([makeMarket('BTC')]),
    );

    await act(async () => {
      callback?.({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        candles: makeCandles(10),
      });
    });
    expect(result.current.sparklines.BTC?.[0]).toBe(100);

    await act(async () => {
      callback?.({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        candles: [],
      });
    });
    expect(result.current.sparklines.BTC?.[0]).toBe(100);

    await act(async () => {
      callback?.({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        candles: makeCandles(10, 200),
      });
    });
    expect(result.current.sparklines.BTC?.[0]).toBe(200);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('force-refreshes only markets without trend data', async () => {
    const { result } = renderHook(() =>
      useHomepageSparklines([
        makeMarket('BTC', makeTrend(10)),
        makeMarket('ETH'),
      ]),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockPrewarmCandles).toHaveBeenCalledTimes(1);
    expect(mockPrewarmCandles).toHaveBeenCalledWith(
      'ETH',
      CandlePeriod.FifteenMinutes,
      TimeDuration.OneDay,
      true,
    );
  });

  it('filters out unparseable trend price entries', () => {
    const markets = [
      makeMarket('BTC', [
        [1700000000000, 'not-a-number'],
        [1700003600000, '101'],
        [1700007200000, '102'],
      ]),
    ];

    const { result } = renderHook(() => useHomepageSparklines(markets));

    expect(result.current.sparklines.BTC).toEqual([101, 102]);
  });

  it('builds sparklines independently per market', () => {
    const markets = [makeMarket('BTC', makeTrend(10))];
    const { result, rerender } = renderHook(
      ({ m }) => useHomepageSparklines(m),
      { initialProps: { m: markets } },
    );

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.ETH).toBeUndefined();

    rerender({ m: [...markets, makeMarket('ETH', makeTrend(10))] });

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.ETH).toBeDefined();
  });
});
