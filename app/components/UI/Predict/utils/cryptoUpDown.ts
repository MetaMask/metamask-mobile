import type { PredictMarket, PredictSeries } from '../types';

export const UP_OR_DOWN_TAG = 'up-or-down';
export const CRYPTO_TAG = 'crypto';

/**
 * Type guard: narrows to a market with a guaranteed `series` field.
 * Returns true when a market has series metadata AND both the "up-or-down"
 * and "crypto" tags. Regular series markets (e.g., recurring tweet counts)
 * and non-crypto up-or-down markets are excluded.
 */
export function isCryptoUpDown(
  market: PredictMarket,
): market is PredictMarket & { series: PredictSeries } {
  return (
    market.series != null &&
    market.tags.includes(UP_OR_DOWN_TAG) &&
    market.tags.includes(CRYPTO_TAG)
  );
}

/**
 * Map of Polymarket tag slugs to crypto trading symbols used by the price-history API.
 */
const CRYPTO_TAG_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  xrp: 'XRP',
  dogecoin: 'DOGE',
  bnb: 'BNB',
  hype: 'HYPE',
};

/**
 * Extracts the crypto trading symbol from a market's tags.
 * Uses tag-based mapping as primary strategy, falls back to parsing the market slug.
 * Only call on markets that pass `isCryptoUpDown()`.
 */
export function getCryptoSymbol(market: PredictMarket): string | undefined {
  const tag = market.tags.find((t) => CRYPTO_TAG_TO_SYMBOL[t]);
  if (tag) return CRYPTO_TAG_TO_SYMBOL[tag];
  // Fallback: parse from slug (e.g., "btc-up-or-down-5m" → "BTC")
  const slugPrefix = market.slug.split('-')[0];
  return slugPrefix ? slugPrefix.toUpperCase() : undefined;
}

/**
 * Map of series recurrence values to Polymarket crypto price-history API variant values.
 */
const RECURRENCE_TO_VARIANT: Record<string, string> = {
  '5m': 'fiveminute',
  '15m': 'fifteen',
  '1h': 'hourly',
  '4h': 'fourhour',
  daily: 'daily',
};

/**
 * Converts a series recurrence (e.g., '5m') to the Polymarket price-history API variant.
 */
export function getVariant(recurrence: string): string {
  return RECURRENCE_TO_VARIANT[recurrence] ?? 'hourly';
}

/**
 * Map of series recurrence to duration in milliseconds.
 */
const RECURRENCE_TO_DURATION_MS: Record<string, number> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

/**
 * Map of series recurrence to duration in seconds.
 */
export const RECURRENCE_TO_DURATION_SECS: Record<string, number> = {
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  daily: 24 * 60 * 60,
};

/**
 * Computes the event start time from the market's endDate and its series recurrence.
 * Returns an ISO 8601 string, or undefined if endDate is missing.
 */
export function getEventStartTime(
  endDate: string | undefined,
  recurrence: string,
): string | undefined {
  if (!endDate) return undefined;
  const durationMs = RECURRENCE_TO_DURATION_MS[recurrence];
  if (!durationMs) return undefined;
  const endMs = new Date(endDate).getTime();
  if (isNaN(endMs)) return undefined;
  return new Date(endMs - durationMs).toISOString();
}
