import type { OrderBookLevel } from '../hooks/stream/usePerpsLiveOrderBook';

/**
 * Maximum API levels to request from Hyperliquid L2Book API.
 * The API returns at most ~20 levels per side when using nSigFigs aggregation.
 */
export const MAX_ORDER_BOOK_LEVELS = 20;

/**
 * Parameters for Hyperliquid L2Book API aggregation.
 */
export interface AggregationParams {
  nSigFigs: 2 | 3 | 4 | 5;
  mantissa?: 2 | 5;
}

/**
 * Calculate nSigFigs and mantissa based on grouping and price.
 * These parameters match Hyperliquid's L2Book API aggregation:
 * - nSigFigs: 5, mantissa: 2 → finest granularity (~$1-2 for BTC)
 * - nSigFigs: 5, mantissa: 5 → ~$5 increments for BTC
 * - nSigFigs: 4 → ~$10 increments for BTC
 * - nSigFigs: 3 → ~$100 increments for BTC
 * - nSigFigs: 2 → ~$1000 increments for BTC (widest range)
 *
 * mantissa is only applicable when nSigFigs is 5.
 */
export function calculateAggregationParams(
  grouping: number,
  price: number,
): AggregationParams {
  // Guard against invalid inputs that would cause Math.log10 to return -Infinity or NaN
  if (price <= 0 || grouping <= 0) {
    return { nSigFigs: 5 };
  }

  const magnitude = Math.floor(Math.log10(price));
  const groupingMagnitude = Math.floor(Math.log10(grouping));
  const baseNSigFigs = magnitude - groupingMagnitude + 1;

  if (baseNSigFigs >= 5) {
    // Finest granularity needs mantissa
    // Derive mantissa from the first digit of grouping
    const firstDigit = Math.floor(grouping / Math.pow(10, groupingMagnitude));
    const mantissa = firstDigit <= 2 ? 2 : 5;
    return { nSigFigs: 5, mantissa };
  }

  // Clamp nSigFigs between 2 and 5 (API only supports these values)
  const clampedNSigFigs = Math.max(2, Math.min(5, baseNSigFigs)) as
    | 2
    | 3
    | 4
    | 5;
  return { nSigFigs: clampedNSigFigs };
}

/**
 * Calculate dynamic grouping options based on asset's mid price.
 * Uses "1-2-5 per decade" scale anchored to price magnitude.
 *
 * @example
 * calculateGroupingOptions(87000) → [1, 2, 5, 10, 100, 1000]           // BTC
 * calculateGroupingOptions(33)    → [0.001, 0.002, 0.005, 0.01, 0.1, 1] // HYPE
 * calculateGroupingOptions(0.002) → [0.000001, 0.00001, 0.0001]        // PUMP
 */
export function calculateGroupingOptions(midPrice: number): number[] {
  if (midPrice <= 0) {
    return [0.01, 0.1, 1]; // Fallback for invalid prices
  }

  const k = Math.floor(Math.log10(midPrice));
  const base = Math.pow(10, k - 4);
  const multipliers = [1, 2, 5, 10, 100, 1000];

  return multipliers.map((m) => base * m);
}

/**
 * Format grouping value for display (e.g., "0.001", "1", "100")
 */
export function formatGroupingLabel(value: number): string {
  if (value >= 1) {
    return value.toString();
  }
  // Calculate decimal places needed
  const decimals = Math.max(0, Math.ceil(-Math.log10(value)));
  return value.toFixed(decimals);
}

/**
 * Select a sensible default grouping option.
 * Picks a middle option that gives reasonable granularity.
 */
export function selectDefaultGrouping(options: number[]): number {
  // Pick the 4th option (index 3) which is typically a good balance
  // For BTC: 10, for HYPE: 0.01, etc.
  return options[3] ?? options[Math.floor(options.length / 2)] ?? options[0];
}

/**
 * Aggregate order book levels by price grouping.
 * Groups prices into buckets, sums sizes, and recalculates cumulative totals.
 *
 * @param levels - Raw order book levels from API
 * @param groupingSize - Price bucket size (e.g., 10 means group by $10 increments)
 * @param side - 'bid' rounds down to bucket, 'ask' rounds up to bucket
 */
export function aggregateOrderBookLevels(
  levels: OrderBookLevel[],
  groupingSize: number,
  side: 'bid' | 'ask',
): OrderBookLevel[] {
  if (!levels.length || groupingSize <= 0) {
    return levels;
  }

  // Group levels by price bucket
  const buckets = new Map<
    number,
    { size: number; notional: number; price: number }
  >();

  for (const level of levels) {
    const price = parseFloat(level.price);
    const size = parseFloat(level.size);
    const notional = parseFloat(level.notional);

    // Round price to bucket
    // Bids: round down (floor) to include in lower bucket
    // Asks: round up (ceil) to include in higher bucket
    let bucketPrice: number;
    if (side === 'bid') {
      bucketPrice = Math.floor(price / groupingSize) * groupingSize;
    } else {
      bucketPrice = Math.ceil(price / groupingSize) * groupingSize;
    }

    const existing = buckets.get(bucketPrice);
    if (existing) {
      existing.size += size;
      existing.notional += notional;
    } else {
      buckets.set(bucketPrice, { size, notional, price: bucketPrice });
    }
  }

  // Convert buckets to array and sort
  const sortedBuckets = Array.from(buckets.values()).sort((a, b) =>
    side === 'bid' ? b.price - a.price : a.price - b.price,
  );

  // Calculate cumulative totals
  let cumulativeSize = 0;
  let cumulativeNotional = 0;

  return sortedBuckets.map((bucket) => {
    cumulativeSize += bucket.size;
    cumulativeNotional += bucket.notional;

    return {
      price: bucket.price.toString(),
      size: bucket.size.toString(),
      total: cumulativeSize.toString(),
      notional: bucket.notional.toFixed(2),
      totalNotional: cumulativeNotional.toFixed(2),
    };
  });
}
