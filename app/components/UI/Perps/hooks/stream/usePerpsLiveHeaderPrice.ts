import { useMemo } from 'react';
import { CandlePeriod, TimeDuration } from '@metamask/perps-controller';
import { usePerpsLiveCandles } from './usePerpsLiveCandles';
import { usePerpsLivePrices } from './usePerpsLivePrices';

// Header-only interval: we only need the latest candle's close price, not
// multi-candle history, so the shortest period keeps the initial REST fetch
// small. `duration` is effectively advisory to CandleStreamChannel (it always
// performs a light, capped fetch internally), so OneDay just documents intent.
const HEADER_PRICE_CANDLE_PERIOD = CandlePeriod.OneMinute;
const HEADER_PRICE_CANDLE_DURATION = TimeDuration.OneDay;

export interface UsePerpsLiveHeaderPriceResult {
  /** Latest candle close price, or undefined until the first tick arrives. */
  price: number | undefined;
  /**
   * 24h percent change, or null while loading. Candles don't carry this
   * field, so it still comes from the allMids price stream — but bundled
   * here so callers get both header values, updating together, from a
   * single hook.
   */
  percentChange24h: number | null;
}

/**
 * Shared "chart-quality" live price (+ 24h change) for screens that don't
 * render a chart.
 *
 * PerpsAdvancedChart gets its current-price line from the candle stream via
 * usePerpsAdvancedChartAdapter, subscribed with NO throttle — every tick is
 * delivered immediately. That's what makes the market details header feel
 * instantaneous, and it's a materially faster/fresher source than the allMids
 * mid-price stream (usePerpsLivePrices), which is deliberately throttled
 * elsewhere to avoid re-running expensive per-tick calculations.
 *
 * This hook gives any component the same candle-derived price and the same
 * unthrottled cadence, without needing to mount an actual chart — so headers
 * on screens like the order form and close position (which have no chart to
 * sync with) can match the market details page's responsiveness. The 24h
 * percent change is subscribed unthrottled from the price stream (candles
 * don't include it) and returned alongside the price.
 */
export function usePerpsLiveHeaderPrice(
  symbol: string,
): UsePerpsLiveHeaderPriceResult {
  const { candleData } = usePerpsLiveCandles({
    symbol,
    interval: HEADER_PRICE_CANDLE_PERIOD,
    duration: HEADER_PRICE_CANDLE_DURATION,
    throttleMs: 0,
  });

  const livePrices = usePerpsLivePrices({
    symbols: [symbol],
    throttleMs: 0,
  });

  const price = useMemo(() => {
    const lastCandle = candleData?.candles?.at(-1);
    if (!lastCandle?.close) {
      return undefined;
    }
    const parsed = Number.parseFloat(lastCandle.close);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [candleData]);

  const percentChange24h = useMemo(() => {
    const priceData = livePrices[symbol];
    if (!priceData || priceData.percentChange24h === undefined) {
      return null;
    }
    return Number.parseFloat(priceData.percentChange24h);
  }, [livePrices, symbol]);

  return { price, percentChange24h };
}
