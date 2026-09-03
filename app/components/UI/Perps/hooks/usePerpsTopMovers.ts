import { useMemo } from 'react';
import {
  type PerpsMarketData,
  type SortDirection,
  sortMarkets,
} from '@metamask/perps-controller';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsLivePrices } from './stream';
import { formatPercentage } from '../utils/formatUtils';

const TOP_MOVERS_LIMIT = 8;
const TOP_MOVERS_THROTTLE_MS = 3000;

export interface UsePerpsTopMoversOptions {
  direction: SortDirection;
  /** When false, skips live price subscriptions and ranking work. Defaults to true. */
  enabled?: boolean;
}

export interface UsePerpsTopMoversResult {
  data: PerpsMarketData[];
  isLoading: boolean;
}

/** Mirrors PerpsTopMoversSection render gating (skeleton while loading, hide when empty). */
export const isPerpsTopMoversSectionVisible = ({
  isLoading,
  data,
}: Pick<UsePerpsTopMoversResult, 'isLoading' | 'data'>): boolean =>
  isLoading || data.length > 0;

/**
 * Returns the top-moving perps markets (gainers or losers) sorted by
 * 24-hour price-change percentage.
 *
 * Data is seeded from the marketData stream channel's synchronous snapshot
 * and disk cache so the section renders without a skeleton on warm starts.
 * Live WebSocket price ticks are merged in every 3 seconds so the ranking
 * reflects real-time movements.
 *
 * The hook keeps the same public API as the previous REST-based version so
 * PerpsTopMoversSection needs no changes.
 *
 * Consumers must be rendered inside `PerpsStreamProvider`.
 */
export const usePerpsTopMovers = ({
  direction,
  enabled = true,
}: UsePerpsTopMoversOptions): UsePerpsTopMoversResult => {
  const { markets, isLoading } = usePerpsMarkets();

  // Subscribe to live prices for every symbol so the ranking stays current.
  // All symbols share a single allMids WebSocket subscription; no extra
  // subscriptions are created here.
  const symbols = useMemo(
    () => (enabled ? markets.map((m) => m.symbol) : []),
    [enabled, markets],
  );
  const livePrices = usePerpsLivePrices({
    symbols,
    throttleMs: TOP_MOVERS_THROTTLE_MS,
  });

  const data = useMemo(() => {
    if (!enabled || markets.length === 0) {
      return [];
    }

    // Merge live price ticks into the base market snapshot.
    // Produces a shallow copy only when live data is available, otherwise
    // returns the original object to preserve referential stability.
    const merged = markets.map((market) => {
      const livePrice = livePrices[market.symbol];
      if (!livePrice?.percentChange24h) {
        return market;
      }

      const changePercent = parseFloat(livePrice.percentChange24h);
      if (Number.isNaN(changePercent)) {
        return market;
      }

      return {
        ...market,
        change24hPercent: formatPercentage(changePercent),
      };
    });

    return sortMarkets({
      markets: merged,
      sortBy: 'priceChange',
      direction,
    }).slice(0, TOP_MOVERS_LIMIT);
  }, [enabled, markets, livePrices, direction]);

  return { data, isLoading: enabled ? isLoading : false };
};
