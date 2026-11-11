import { useEffect, useState } from 'react';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  fetchHyperliquidHistoricalPrices,
  type HyperliquidCandleInterval,
} from '../../utils/hyperliquidPrices';
import type { ChartPeriod } from '../utils/chartWindow';

/**
 * One candle request for the selected period. The sheet fetches only the
 * period on screen, so the other ranges are not requested until chosen.
 */
const PERIOD_CANDLES: Record<
  ChartPeriod,
  { interval: HyperliquidCandleInterval; limit: number }
> = {
  '1D': { interval: '15m', limit: 96 },
  '1W': { interval: '1h', limit: 168 },
  '1M': { interval: '4h', limit: 180 },
  All: { interval: '1d', limit: 1095 },
};

export interface UsePerpsSheetPricesParams {
  /** Perp coin as Hyperliquid names it (the position's `tokenSymbol`). */
  symbol: string | undefined;
  period: ChartPeriod;
  nowMs: number;
  enabled: boolean;
}

export interface UsePerpsSheetPricesResult {
  prices: TokenPrice[];
  isLoading: boolean;
}

export function usePerpsSheetPrices({
  symbol,
  period,
  nowMs,
  enabled,
}: UsePerpsSheetPricesParams): UsePerpsSheetPricesResult {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  // Drop the previous series during render. The fetch effect runs after
  // paint, and the old candles would otherwise draw on the new axis.
  const [request, setRequest] = useState({ symbol, period, enabled });
  if (
    request.symbol !== symbol ||
    request.period !== period ||
    request.enabled !== enabled
  ) {
    setRequest({ symbol, period, enabled });
    setPrices([]);
    setIsLoading(Boolean(enabled && symbol));
  }

  useEffect(() => {
    if (!enabled || !symbol) {
      setPrices([]);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    const candles = PERIOD_CANDLES[period];

    fetchHyperliquidHistoricalPrices({
      symbol,
      interval: candles.interval,
      limit: candles.limit,
      nowMs,
    })
      .then((result) => {
        if (cancelled) return;
        setPrices(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPrices([]);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, symbol, period, nowMs]);

  return { prices, isLoading };
}
