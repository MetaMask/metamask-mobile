import {
  type OrderBookData,
  type OrderBookLevel,
} from '@metamask/perps-controller';
import {
  type FiatRangeConfig,
  formatPerpsFiat,
  formatPositionSize,
  formatLargeNumber,
  PRICE_RANGES_UNIVERSAL,
} from './formatUtils';

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

/**
 * Size/total values switch to compact K/M/B/T notation at or above this
 * amount. The value column is only 62px wide, so anything with more than four
 * digits has to be abbreviated — low-priced assets (PUMP, PEPE) otherwise
 * render 7-10 digit sizes that overflow or shrink the price column.
 */
const COMPACT_NOTATION_THRESHOLD = 1_000;

/**
 * Decimals kept on compacted values ("$2.1K", "604.9K", "$1.2M"). Fixed
 * rather than magnitude-dependent so the right-aligned column stays aligned.
 */
const COMPACT_NOTATION_DECIMALS = 1;

/** Hyperliquid's absolute cap on perp price decimals (`MaxPriceDecimals`). */
const MAX_PRICE_DECIMALS = 6;

/** Decimal places kept when rendering the spread as a percentage. */
const SPREAD_PERCENT_DECIMALS = 3;

/** Shown when a value has not loaded / cannot be parsed. */
const ORDER_BOOK_FALLBACK_DISPLAY = '—';

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
 * a recomputed `maxTotal` used to scale the depth bars.
 *
 * When `grouping` is null (e.g. the stream is already server-aggregated), levels
 * are only trimmed — no client-side re-bucketing.
 */
export function groupOrderBook(
  orderBook: OrderBookData,
  grouping: number | null,
  maxLevels: number = ORDER_BOOK_AGGREGATED_LEVELS,
): { bids: OrderBookLevel[]; asks: OrderBookLevel[]; maxTotal: number } {
  const bids = grouping
    ? aggregateOrderBookLevels(orderBook.bids, grouping, 'bid')
    : orderBook.bids;
  const asks = grouping
    ? aggregateOrderBookLevels(orderBook.asks, grouping, 'ask')
    : orderBook.asks;

  const trimmedBids = bids.slice(0, maxLevels);
  const trimmedAsks = asks.slice(0, maxLevels);

  const maxTotal = [...trimmedBids, ...trimmedAsks].reduce((max, level) => {
    const total = Number.parseFloat(level.total);
    return Number.isFinite(total) && total > max ? total : max;
  }, 0);

  return { bids: trimmedBids, asks: trimmedAsks, maxTotal };
}

/**
 * Depth-bar width (0-100) for a level relative to the deepest level.
 */
export function getDepthWidth(level: OrderBookLevel, maxTotal: number): number {
  if (!Number.isFinite(maxTotal) || maxTotal <= 0) {
    return 0;
  }
  const total = Number.parseFloat(level.total);
  if (!Number.isFinite(total)) {
    return 0;
  }
  return Math.min((total / maxTotal) * 100, 100);
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return ORDER_BOOK_FALLBACK_DISPLAY;
  }
  if (Math.abs(value) >= COMPACT_NOTATION_THRESHOLD) {
    return `$${formatLargeNumber(value, {
      decimals: COMPACT_NOTATION_DECIMALS,
    })}`;
  }
  return formatPerpsFiat(value, { ranges: PRICE_RANGES_UNIVERSAL });
}

function formatBase(value: number, szDecimals?: number): string {
  if (!Number.isFinite(value)) {
    return ORDER_BOOK_FALLBACK_DISPLAY;
  }
  if (Math.abs(value) >= COMPACT_NOTATION_THRESHOLD) {
    return formatLargeNumber(value, { decimals: COMPACT_NOTATION_DECIMALS });
  }
  return formatPositionSize(value, szDecimals);
}

/**
 * Exact decimal-place count for a number, via its exponential form so values
 * like 1e-7 and 0.002 are read off the mantissa/exponent instead of a
 * `Math.log10` result that can land just under an integer boundary.
 */
function countDecimalPlaces(value: number): number {
  const [mantissa, exponent] = Math.abs(value).toExponential().split('e');
  const mantissaDecimals = (mantissa.split('.')[1] ?? '').length;
  return Math.max(0, mantissaDecimals - Number(exponent));
}

/**
 * Decimal places every price in the ladder should render with.
 *
 * The rule: **match the active grouping increment**, capped at Hyperliquid's
 * price precision for the asset (`6 - szDecimals`). The grouping is the price
 * step actually being displayed, so it is the only precision that carries
 * information — showing fewer decimals collapses neighbouring levels into one
 * identical string (every PEPE level rendered as "$0.00001"), and showing more
 * only adds noise. Applying one count to all rows also keeps the column from
 * wobbling, which is what trailing-zero stripping caused ("$0.002097" above
 * "$0.0021").
 *
 * @param grouping - Active price grouping increment, or null when unknown.
 * @param szDecimals - Asset base-size precision from Hyperliquid metadata.
 * @returns Fixed decimal count, or null to fall back to magnitude-based rules.
 */
export function getOrderBookPriceDecimals(
  grouping: number | null,
  szDecimals?: number,
): number | null {
  if (grouping === null || !Number.isFinite(grouping) || grouping <= 0) {
    return null;
  }
  const maxDecimals =
    typeof szDecimals === 'number' && Number.isFinite(szDecimals)
      ? Math.max(0, MAX_PRICE_DECIMALS - szDecimals)
      : MAX_PRICE_DECIMALS;
  return Math.min(countDecimalPlaces(grouping), maxDecimals);
}

/**
 * Range configs are rebuilt per decimal count, so cache them — the ladder
 * reformats every price on each live tick.
 */
const fixedDecimalRanges = new Map<number, FiatRangeConfig[]>();

function getFixedDecimalRanges(decimals: number): FiatRangeConfig[] {
  const cached = fixedDecimalRanges.get(decimals);
  if (cached) {
    return cached;
  }
  const ranges: FiatRangeConfig[] = [
    {
      condition: () => true,
      minimumDecimals: decimals,
      maximumDecimals: decimals,
      // 0 disables the "<$x" small-value substitution, which would otherwise
      // mask genuine sub-cent ladder prices.
      threshold: 0,
    },
  ];
  fixedDecimalRanges.set(decimals, ranges);
  return ranges;
}

/**
 * Format a ladder price at the fixed precision from `getOrderBookPriceDecimals`.
 * Falls back to magnitude-based formatting when precision is unknown.
 */
export function formatOrderBookPrice(
  price: string | number,
  priceDecimals: number | null,
): string {
  const value = typeof price === 'number' ? price : Number.parseFloat(price);
  if (!Number.isFinite(value)) {
    return ORDER_BOOK_FALLBACK_DISPLAY;
  }
  if (priceDecimals === null) {
    return formatPerpsFiat(value, { ranges: PRICE_RANGES_UNIVERSAL });
  }
  return formatPerpsFiat(value, {
    ranges: getFixedDecimalRanges(priceDecimals),
    stripTrailingZeros: false,
  });
}

/**
 * Format the value shown in the metric column based on currency + metric.
 *
 * Anything at or above 1,000 is abbreviated to one decimal ("$2.1K", "1.2M")
 * in both denominations; below that, USD uses fiat rules and base sizes use
 * the asset's `szDecimals`.
 */
export function formatColumnValue(
  level: OrderBookLevel,
  currency: OrderBookListCurrency,
  metric: OrderBookListMetric,
  szDecimals?: number,
): string {
  if (currency === 'usd') {
    const raw = metric === 'total' ? level.totalNotional : level.notional;
    return formatUsd(Number.parseFloat(raw));
  }
  const raw = metric === 'total' ? level.total : level.size;
  return formatBase(Number.parseFloat(raw), szDecimals);
}

/**
 * Format the bid/ask spread as a percentage string (e.g. "0.003%").
 */
export function formatSpreadPercent(spreadPercentage: number): string {
  if (!Number.isFinite(spreadPercentage)) {
    return ORDER_BOOK_FALLBACK_DISPLAY;
  }
  const rounded = Number(spreadPercentage.toFixed(SPREAD_PERCENT_DECIMALS));
  return `${rounded}%`;
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
