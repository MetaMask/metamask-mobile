import type { OrderBookData, OrderBookLevel } from '@metamask/perps-controller';
import type {
  HydromancerL2BookData,
  HydromancerL2BookMessage,
  HydromancerLevel,
} from '../types/hydromancer';

/** Hydromancer's documented `l2Book` push cadence: one snapshot per block. */
export const HYDROMANCER_BLOCK_MS = 70;

/** Default/max depth per side for this PoC (the investigation doc's goal). */
export const HYDROMANCER_MAX_LEVELS = 20;

/**
 * Converts one side (bids or asks) of a Hydromancer `l2Book` snapshot into
 * the app's `OrderBookLevel[]` shape, computing cumulative size/notional.
 *
 * Mirrors the cumulative-total math `aggregateOrderBookLevels` already
 * applies to Hyperliquid's own `l2Book` levels (see `./orderBookGrouping.ts`)
 * — Hydromancer's `{ px, sz, n }` level shape is identical, so the same
 * bucket-free cumulative pass applies directly.
 */
function toOrderBookLevels(
  levels: HydromancerLevel[],
  maxLevels: number,
): OrderBookLevel[] {
  let cumulativeSize = 0;
  let cumulativeNotional = 0;

  return levels.slice(0, maxLevels).map((level) => {
    const price = Number.parseFloat(level.px);
    const size = Number.parseFloat(level.sz);
    const notional =
      Number.isFinite(price) && Number.isFinite(size) ? price * size : 0;

    cumulativeSize += Number.isFinite(size) ? size : 0;
    cumulativeNotional += notional;

    return {
      price: level.px,
      size: level.sz,
      total: cumulativeSize.toString(),
      notional: notional.toFixed(2),
      totalNotional: cumulativeNotional.toFixed(2),
    };
  });
}

/**
 * Maps a Hydromancer `l2Book` snapshot to the `OrderBookData` shape the
 * order-book UI already consumes. A drop-in equivalent of the Hyperliquid
 * side's `processAggregatedOrderBook` (from `@metamask/perps-controller`),
 * for Hydromancer's identically-shaped levels.
 *
 * Used for both the real feed (once `MM_PERPS_HYDROMANCER_API_KEY` is set)
 * and the mock feed below — the mapper is the same either way, so swapping
 * in a real key does not change this function or anything downstream of it.
 */
export function processHydromancerOrderBook(
  data: HydromancerL2BookData,
  maxLevels: number = HYDROMANCER_MAX_LEVELS,
): OrderBookData {
  const [rawBids, rawAsks] = data.levels;
  const bids = toOrderBookLevels(rawBids, maxLevels);
  const asks = toOrderBookLevels(rawAsks, maxLevels);

  const bestBid = Number.parseFloat(bids[0]?.price ?? '');
  const bestAsk = Number.parseFloat(asks[0]?.price ?? '');
  const hasSpread = Number.isFinite(bestBid) && Number.isFinite(bestAsk);
  const spread = hasSpread ? bestAsk - bestBid : 0;
  const midPrice = hasSpread ? (bestBid + bestAsk) / 2 : 0;
  const spreadPercentage = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  const maxTotal = [...bids, ...asks].reduce((max, level) => {
    const total = Number.parseFloat(level.total);
    return Number.isFinite(total) && total > max ? total : max;
  }, 0);

  return {
    bids,
    asks,
    spread: spread.toString(),
    spreadPercentage: spreadPercentage.toString(),
    midPrice: midPrice.toString(),
    lastUpdated: data.time,
    maxTotal: maxTotal.toString(),
  };
}

/**
 * Deterministic-shape (not deterministic-value) synthetic order book around
 * `midPrice`, wrapped exactly like a real Hydromancer `l2Book` snapshot
 * (`{ px, sz, n }` levels, incrementing `seq`, `cursor: '0'`).
 *
 * Used when `MM_PERPS_HYDROMANCER_API_KEY` is unset so the rest of the
 * pipeline — mapper, hook, UI — runs unchanged once a real key is added. See
 * `../services/hydromancerOrderBookConnection.ts`.
 */
export function createMockHydromancerL2BookMessage({
  coin,
  seq,
  midPrice,
  levels = HYDROMANCER_MAX_LEVELS,
}: {
  coin: string;
  seq: number;
  midPrice: number;
  levels?: number;
}): HydromancerL2BookMessage {
  const safeMid = Number.isFinite(midPrice) && midPrice > 0 ? midPrice : 100;
  // Tick size scales with price magnitude so both e.g. BTC and a sub-$1
  // token get a plausible-looking ladder step instead of a fixed absolute one.
  const tick = Math.max(safeMid * 0.00005, 1e-8);

  const buildSide = (side: 'bid' | 'ask'): HydromancerLevel[] =>
    Array.from({ length: levels }, (_, index) => {
      const step = index + 1;
      const jitter = 1 + (Math.random() - 0.5) * 0.1;
      const price =
        side === 'bid' ? safeMid - tick * step : safeMid + tick * step;
      // Resting size grows with depth, with a little per-tick jitter so the
      // ladder visibly updates on every ~70ms mock block.
      const size = (0.5 + step * 0.35) * jitter;
      return {
        px: price.toFixed(8),
        sz: size.toFixed(4),
        n: Math.max(1, Math.round(step / 3)),
      };
    });

  return {
    type: 'l2Book',
    channel: 'l2Book',
    seq,
    cursor: '0',
    data: {
      coin,
      time: Date.now(),
      levels: [buildSide('bid'), buildSide('ask')],
    },
  };
}
