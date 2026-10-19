import type { TradingViewChartRef } from '../components/TradingViewChart';

/**
 * Reframes the lightweight chart on refresh while preserving the user's
 * persisted zoom. Resetting first keeps the existing "latest candle" refresh
 * behavior; applying the saved count last prevents the default zoom from
 * winning.
 */
export function refreshLightweightChartViewport(
  chart: TradingViewChartRef | null,
  visibleCandleCount: number,
): void {
  chart?.resetToDefault();
  chart?.zoomToLatestCandle(visibleCandleCount);
}
