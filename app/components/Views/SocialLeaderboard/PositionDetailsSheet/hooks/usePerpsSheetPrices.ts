import { useEffect, useState } from 'react';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
} from '../../utils/hyperliquidPrices';

/** Hourly candles: a week is 168 points, enough for a smooth line. */
const PERPS_SHEET_INTERVAL = '1h';
const PERPS_SHEET_BASE_LIMIT = 168;

export interface UsePerpsSheetPricesParams {
  /** Perp coin as Hyperliquid names it (the position's `tokenSymbol`). */
  symbol: string | undefined;
  earliestTradeMs: number | undefined;
  nowMs: number;
  enabled: boolean;
}

export interface UsePerpsSheetPricesResult {
  prices: TokenPrice[];
  isLoading: boolean;
}

/**
 * One hourly `candleSnapshot` request covering the sheet's window. Unlike
 * `usePerpsTraderPositionPrices` it does not prefetch every chart period: the
 * sheet has no period selector, so the other four requests would be wasted.
 */
export function usePerpsSheetPrices({
  symbol,
  earliestTradeMs,
  nowMs,
  enabled,
}: UsePerpsSheetPricesParams): UsePerpsSheetPricesResult {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !symbol) {
      setPrices([]);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    const limit = resolveHyperliquidCandleLimit({
      interval: PERPS_SHEET_INTERVAL,
      baseLimit: PERPS_SHEET_BASE_LIMIT,
      earliestTradeMs,
      nowMs,
    });

    fetchHyperliquidHistoricalPrices({
      symbol,
      interval: PERPS_SHEET_INTERVAL,
      limit,
      nowMs,
    }).then((result) => {
      if (cancelled) return;
      setPrices(result);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, symbol, earliestTradeMs, nowMs]);

  return { prices, isLoading };
}
