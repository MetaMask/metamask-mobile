import { useMemo } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';

const SPARKLINE_TARGET_POINTS = 50;

export interface UseHomepageSparklinesResult {
  sparklines: Record<string, number[]>;
}

type MarketTrend = [number, string][];

/**
 * `trend` is populated by the paired @metamask/perps-controller change (see
 * docs/decisions/0001-perps-homepage-hyperliquid-calls.md) but isn't in the
 * currently published package types yet, so it's read via this local type
 * rather than `PerpsMarketData['trend']`. Drop this once the dependency is
 * bumped to a release that declares the field.
 */
type MarketWithTrend = PerpsMarketData & { trend?: MarketTrend };

function downsample(data: number[], targetLength: number): number[] {
  if (data.length <= targetLength) return data;
  const result: number[] = [];
  const step = (data.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    result.push(data[Math.round(i * step)]);
  }
  return result;
}

function extractCloses(trend: MarketTrend | undefined): number[] {
  if (!trend || trend.length === 0) return [];
  return trend
    .map(([, price]) => Number.parseFloat(String(price)))
    .filter((price) => !Number.isNaN(price));
}

/**
 * Build downsampled close-price arrays for sparklines from each market's
 * `trend` field, which already comes from the Terminal API response.
 *
 * Previously this subscribed to a per-symbol candle stream, which fired a
 * HyperLiquid `candleSnapshot` call per symbol on every reconnect. Reading
 * `trend` instead avoids that, at the cost of hourly (not live) freshness —
 * fine for the small homepage preview. See
 * docs/decisions/0001-perps-homepage-hyperliquid-calls.md.
 *
 * @param markets - Markets to build sparklines for.
 */
export function useHomepageSparklines(
  markets: PerpsMarketData[],
): UseHomepageSparklinesResult {
  const safeMarkets = useMemo(() => markets ?? [], [markets]);

  const sparklines = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const market of safeMarkets) {
      const closes = extractCloses((market as MarketWithTrend).trend);
      if (closes.length < 2) continue;
      result[market.symbol] = downsample(closes, SPARKLINE_TARGET_POINTS);
    }
    return result;
  }, [safeMarkets]);

  return useMemo(() => ({ sparklines }), [sparklines]);
}
