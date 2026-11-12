import { useCallback, useEffect, useState } from 'react';
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

/** A hung candle request is abandoned, then tried once more. */
const PERPS_PRICE_ATTEMPTS = 2;
const PERPS_PRICE_TIMEOUT_MS = 10_000;

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
  /** True when both attempts came back empty or failed. The chart stops waiting. */
  isError: boolean;
  retry: () => void;
}

export function usePerpsSheetPrices({
  symbol,
  period,
  nowMs,
  enabled,
}: UsePerpsSheetPricesParams): UsePerpsSheetPricesResult {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
    setIsError(false);
  }

  const retry = useCallback((): void => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !symbol) {
      setPrices([]);
      setIsLoading(false);
      setIsError(false);
      return undefined;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const controllers: AbortController[] = [];
    setIsLoading(true);
    setIsError(false);
    const candles = PERIOD_CANDLES[period];

    const load = async (): Promise<void> => {
      let latest: TokenPrice[] = [];
      for (let attempt = 0; attempt < PERPS_PRICE_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        const controller = new AbortController();
        controllers.push(controller);
        const timer = setTimeout((): void => {
          controller.abort();
        }, PERPS_PRICE_TIMEOUT_MS);
        timers.push(timer);
        try {
          latest = await fetchHyperliquidHistoricalPrices({
            symbol,
            interval: candles.interval,
            limit: candles.limit,
            nowMs,
            signal: controller.signal,
          });
          if (latest.length > 0) break;
        } catch {
          latest = [];
        } finally {
          clearTimeout(timer);
        }
      }
      if (cancelled) return;
      setPrices(latest);
      setIsLoading(false);
      setIsError(latest.length === 0);
    };

    load().catch(() => undefined);

    return (): void => {
      cancelled = true;
      timers.forEach((timer) => clearTimeout(timer));
      controllers.forEach((controller) => controller.abort());
    };
  }, [enabled, symbol, period, nowMs, reloadKey]);

  return { prices, isLoading, isError, retry };
}
