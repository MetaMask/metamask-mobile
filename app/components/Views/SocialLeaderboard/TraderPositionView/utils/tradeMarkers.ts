import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';

export interface TradeMarker {
  /** Index into the `priceList` array derived from `prices`. */
  index: number;
  /** `'enter'` = buy (green), `'exit'` = sell (red). */
  intent: 'enter' | 'exit';
  /** Stable React key and testID suffix. */
  transactionHash: string;
}

/** Normalize a trade timestamp: treat values < 1e12 as seconds → convert to ms. */
const normalizeTs = (ts: number) => (ts > 0 && ts < 1e12 ? ts * 1000 : ts);

/**
 * Maps each `Trade` to the nearest price-data index in `prices`.
 *
 * Trades that fall outside the visible time window (before the first price
 * timestamp or after the last) are silently dropped so markers stay in-bounds.
 * Uses binary search for O(log n) per trade.
 */
export function mapTradesToMarkers(
  trades: readonly Trade[] | undefined,
  prices: readonly TokenPrice[],
): TradeMarker[] {
  if (!trades?.length || prices.length < 2) return [];

  const tsList = prices.map((p) => Number(p[0]));
  const first = tsList[0];
  const last = tsList[tsList.length - 1];

  return trades.flatMap((t) => {
    const ts = normalizeTs(t.timestamp);
    if (ts < first || ts > last) return [];

    // Binary search: find the largest index whose timestamp <= ts.
    let lo = 0;
    let hi = tsList.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (tsList[mid] <= ts) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    // Pick the closer of the two candidates.
    const index = ts - tsList[lo] <= tsList[hi] - ts ? lo : hi;
    return [{ index, intent: t.intent, transactionHash: t.transactionHash }];
  });
}
