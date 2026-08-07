import { useMemo } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';

const SPARKLINE_TARGET_POINTS = 50;

export interface UseHomepageSparklinesResult {
  sparklines: Record<string, number[]>;
}

function downsample(data: number[], targetLength: number): number[] {
  if (data.length <= targetLength) return data;
  const result: number[] = [];
  const step = (data.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    result.push(data[Math.round(i * step)]);
  }
  return result;
}

function extractCloses(trend: PerpsMarketData['trend']): number[] {
  if (!trend || trend.length === 0) return [];
  return trend
    .map(([, price]) => parseFloat(String(price)))
    .filter((price) => !isNaN(price));
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
      const closes = extractCloses(market.trend);
      if (closes.length < 2) continue;
      result[market.symbol] = downsample(closes, SPARKLINE_TARGET_POINTS);
    }
    return result;
  }, [safeMarkets]);

  return useMemo(() => ({ sparklines }), [sparklines]);
}
