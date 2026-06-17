import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import Logger from '../../../../util/Logger';

/**
 * Hyperliquid's public REST "info" endpoint. Hyperliquid is perp-only and is
 * deliberately kept out of the spot price API path (see chainMapping); its
 * historical prices come straight from the exchange's candle-snapshot endpoint
 * — the same data source the Perps feature ultimately uses — fetched once, with
 * no WebSocket or connection setup.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#candle-snapshot
 */
export const HYPERLIQUID_INFO_URL = 'https://api.hyperliquid.xyz/info';

/** Candle intervals we request to cover the chart's time periods. */
export type HyperliquidCandleInterval = '1m' | '15m' | '1h' | '4h' | '1d';

/** Milliseconds per candle interval — used to derive the snapshot start time. */
const INTERVAL_MS: Record<HyperliquidCandleInterval, number> = {
  '1m': 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};

/** Single entry from the candleSnapshot response (only the fields we consume). */
interface HyperliquidCandle {
  /** Open time, ms since epoch. */
  t: number;
  /** Close price as a decimal string. */
  c: string;
}

export interface FetchHyperliquidPricesParams {
  /** Perp coin symbol, e.g. "BTC" — the position's `tokenSymbol`. */
  symbol: string;
  interval: HyperliquidCandleInterval;
  /** Number of candles to request; also sets the look-back window. */
  limit: number;
  /**
   * Current epoch ms, injected so callers can share one clock across periods
   * and tests stay deterministic.
   */
  nowMs: number;
}

/**
 * Fetches historical prices for a Hyperliquid perp symbol via the public
 * `candleSnapshot` REST endpoint and maps them to the chart's
 * `[timestamp, price]` tuples using each candle's close price.
 *
 * One-shot request (no WebSocket). Returns an empty array on any error or empty
 * response so the chart falls back to its no-data state rather than throwing.
 *
 * @param params - See {@link FetchHyperliquidPricesParams}.
 * @returns Historical prices ordered oldest-to-newest, or `[]`.
 */
export async function fetchHyperliquidHistoricalPrices({
  symbol,
  interval,
  limit,
  nowMs,
}: FetchHyperliquidPricesParams): Promise<TokenPrice[]> {
  if (!symbol) {
    return [];
  }

  const startTime = nowMs - limit * INTERVAL_MS[interval];

  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: { coin: symbol, interval, startTime, endTime: nowMs },
      }),
    });

    if (!response.ok) {
      return [];
    }

    const candles = (await response.json()) as HyperliquidCandle[] | null;
    if (!Array.isArray(candles)) {
      return [];
    }

    return candles
      .map((candle) => [String(candle.t), Number(candle.c)] as TokenPrice)
      .filter((point) => Number.isFinite(point[1]));
  } catch (error) {
    Logger.error(
      error as Error,
      `fetchHyperliquidHistoricalPrices: failed to fetch ${symbol} ${interval} candles`,
    );
    return [];
  }
}
