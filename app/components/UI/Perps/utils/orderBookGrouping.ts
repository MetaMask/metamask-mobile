import {
  type OrderBookData,
  type OrderBookLevel,
  type PerpsOrderBookPriceFormat,
} from '@metamask/perps-controller';
import { BigNumber } from 'bignumber.js';
import { formatPercentage, formatPerpsCompact } from './formatUtils';

/**
 * Maximum API levels to request from Hyperliquid L2Book API.
 * The API returns at most ~20 levels per side when using nSigFigs aggregation.
 */
export const MAX_ORDER_BOOK_LEVELS = 20;

/**
 * Depth cap for Hyperliquid's fast order book stream (~0.5s cadence).
 * When `fast: true` is passed to `usePerpsLiveOrderBook`, the API returns at
 * most 5 levels per side regardless of the requested `levels` value, so this
 * is the only value that should be paired with `fast: true` — passing a
 * larger `levels` (e.g. MAX_ORDER_BOOK_LEVELS) alongside `fast: true` sends
 * contradictory depth signals to the API.
 */
export const FAST_ORDER_BOOK_LEVELS = 5;

/**
 * Levels requested from (and rendered for) the server-aggregated order-book
 * stream on the dedicated AggregatedOrderBookConnection. The connection always
 * runs Hyperliquid's fast mode (≤5 levels per side); this depth matches the
 * Extension ladder display budget.
 */
export const ORDER_BOOK_AGGREGATED_LEVELS = 20;

/** Currency the metric column is denominated in. */
export type OrderBookListCurrency = 'base' | 'usd';

/** Metric shown in the value column: per-level size or cumulative total. */
export type OrderBookListMetric = 'size' | 'total';

/** Decimal places kept when rendering the spread as a percentage. */
const SPREAD_PERCENT_DECIMALS = 3;

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
 * - nSigFigs: 5 (no mantissa) → finest granularity (~$1 for BTC)
 * - nSigFigs: 5, mantissa: 2 → ~$2 increments for BTC
 * - nSigFigs: 5, mantissa: 5 → ~$5 increments for BTC
 * - nSigFigs: 4 → ~$10 increments for BTC
 * - nSigFigs: 3 → ~$100 increments for BTC
 * - nSigFigs: 2 → ~$1000 increments for BTC (widest range)
 *
 * mantissa is only applicable when nSigFigs is 5.
 *
 * @param grouping - The price grouping increment
 * @param price - The current mid price
 * @returns Aggregation parameters for the API
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
    const firstDigit = Math.floor(grouping / Math.pow(10, groupingMagnitude));
    if (firstDigit <= 1) {
      return { nSigFigs: 5 };
    }
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
 * @param midPrice - The current mid price of the asset
 * @returns Array of grouping options suitable for the price magnitude
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
 * Format grouping value for display (e.g., "0.001", "1", "100").
 *
 * @param value - The grouping value to format
 * @returns Formatted string representation
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
 *
 * @param options - Array of available grouping options
 * @returns The recommended default grouping value
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

/**
 * Apply price grouping to an order book, returning trimmed bid/ask ladders and
 * the two denominators used to scale the depth bars: `maxTotal` for the
 * cumulative ladder and `maxSize` for the per-level one.
 *
 * When `grouping` is null (e.g. the stream is already server-aggregated), levels
 * are only trimmed — no client-side re-bucketing.
 */
export function groupOrderBook(
  orderBook: OrderBookData,
  grouping: number | null,
  maxLevels: number = ORDER_BOOK_AGGREGATED_LEVELS,
): {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  maxTotal: number;
  maxSize: number;
} {
  const bids = grouping
    ? aggregateOrderBookLevels(orderBook.bids, grouping, 'bid')
    : orderBook.bids;
  const asks = grouping
    ? aggregateOrderBookLevels(orderBook.asks, grouping, 'ask')
    : orderBook.asks;

  const trimmedBids = bids.slice(0, maxLevels);
  const trimmedAsks = asks.slice(0, maxLevels);

  const trimmed = [...trimmedBids, ...trimmedAsks];

  const maxTotal = trimmed.reduce((max, level) => {
    const total = Number.parseFloat(level.total);
    return Number.isFinite(total) && total > max ? total : max;
  }, 0);

  const maxSize = trimmed.reduce((max, level) => {
    const size = Number.parseFloat(level.size);
    return Number.isFinite(size) && size > max ? size : max;
  }, 0);

  return { bids: trimmedBids, asks: trimmedAsks, maxTotal, maxSize };
}

/**
 * Depth-bar width (0-100) for a level, scaled against whichever quantity the
 * ladder is listing by.
 *
 * `total` measures the level against the deepest cumulative total, so the bars
 * climb toward the edge of the book. `size` measures each level against the
 * largest single level, so a bar reads as that tick's own share of the ladder
 * rather than everything resting in front of it (TAT-3966).
 */
export function getDepthWidth(
  level: OrderBookLevel,
  max: number,
  metric: OrderBookListMetric,
): number {
  if (!Number.isFinite(max) || max <= 0) {
    return 0;
  }
  const value = Number.parseFloat(metric === 'size' ? level.size : level.total);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min((value / max) * 100, 100);
}

/**
 * The numeric value a ladder row stands for, at the precision that row is
 * rendered with.
 *
 * Tapping a row prefills the order form, and the price it fills has to be the
 * one the user read. `formatPerpsOrderBookPrice` rounds every level to the shared
 * format, so a level carrying more precision than the ladder shows — a BTC row
 * displaying "$64,123" that sits on a raw `64123.4` — otherwise fills a decimal
 * that neither the row nor the market price ever displayed.
 *
 * Rounding here only ever drops digits, so the result keeps no more decimals
 * and no more significant figures than the venue's own price and stays on a
 * valid tick. Abbreviated formats round the scaled mantissa, since that is the
 * figure on screen ("$64.12K" means `64120`, not `64123.4`).
 *
 * @param price - Raw level price from the venue.
 * @param format - The ladder's shared price format, or null when unknown.
 * @returns The row's price as a plain decimal string.
 */
export function getOrderBookPriceValue(
  price: string,
  format: PerpsOrderBookPriceFormat | null,
): string {
  if (format === null) {
    return price;
  }

  const value = new BigNumber(price);
  if (!value.isFinite()) {
    return price;
  }

  const rounded = value
    .dividedBy(format.divisor)
    .decimalPlaces(format.decimals, BigNumber.ROUND_HALF_UP)
    .multipliedBy(format.divisor);

  // A format coarser than the level itself rounds it away entirely (a stale mid
  // sets the grouping while a fresh ladder arrives for a far cheaper asset).
  // Committing that zero would be worse than committing extra precision.
  return rounded.isGreaterThan(0) ? rounded.toFixed() : price;
}

/**
 * Format the value shown in the metric column based on currency + metric,
 * with Core's compact order book formats: from 1,000 up abbreviated to one
 * decimal ("$2.1K", "1.2M") in both denominations; below that, USD uses fiat
 * rules and base sizes use the asset's `szDecimals`.
 */
export function formatColumnValue(
  level: OrderBookLevel,
  currency: OrderBookListCurrency,
  metric: OrderBookListMetric,
  szDecimals?: number,
): string {
  if (currency === 'usd') {
    const raw = metric === 'total' ? level.totalNotional : level.notional;
    return formatPerpsCompact(raw, { field: 'orderBookUsd' });
  }
  const raw = metric === 'total' ? level.total : level.size;
  return formatPerpsCompact(raw, { field: 'orderBookSize', szDecimals });
}

/**
 * Format the bid/ask spread as a percentage string (e.g. "0.003%").
 */
export function formatSpreadPercent(spreadPercentage: number): string {
  return formatPercentage(spreadPercentage, {
    decimals: SPREAD_PERCENT_DECIMALS,
    stripTrailingZeros: true,
    sign: 'never',
  });
}

/**
 * Compute the buy/sell depth ratio from the deepest displayed level on each side.
 */
export function getDepthRatio(
  bids: OrderBookLevel[],
  asks: OrderBookLevel[],
): { buyPercent: number; sellPercent: number } | null {
  const bidDepth = bids.length
    ? Number.parseFloat(bids[bids.length - 1].total)
    : 0;
  const askDepth = asks.length
    ? Number.parseFloat(asks[asks.length - 1].total)
    : 0;
  const safeBidDepth = Number.isFinite(bidDepth) ? bidDepth : 0;
  const safeAskDepth = Number.isFinite(askDepth) ? askDepth : 0;
  const totalDepth = safeBidDepth + safeAskDepth;
  if (totalDepth <= 0) {
    return null;
  }
  const buyPercent = Math.round((safeBidDepth / totalDepth) * 100);
  return { buyPercent, sellPercent: 100 - buyPercent };
}
