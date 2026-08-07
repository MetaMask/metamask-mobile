import { renderHook } from '@testing-library/react-native';
import { useHomepageSparklines } from './useHomepageSparklines';
import type { PerpsMarketData } from '@metamask/perps-controller';

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

describe('useHomepageSparklines', () => {
  it('builds sparklines from market trend data', () => {
    const markets = [
      makeMarket('BTC', makeTrend(60)),
      makeMarket('ETH', makeTrend(60)),
    ];

    const { result } = renderHook(() => useHomepageSparklines(markets));

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.BTC.length).toBe(50);
    expect(result.current.sparklines.ETH).toBeDefined();
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

  it('skips markets with no trend data', () => {
    const markets = [makeMarket('BTC')];

    const { result } = renderHook(() => useHomepageSparklines(markets));

    expect(result.current.sparklines.BTC).toBeUndefined();
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
