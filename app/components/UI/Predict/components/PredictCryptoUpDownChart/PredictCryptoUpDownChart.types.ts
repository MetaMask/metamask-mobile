import type { PredictMarket, PredictSeries } from '../../types';

export interface PredictCryptoUpDownChartProps {
  market: PredictMarket & { series: PredictSeries };
  targetPrice?: number;
  onCurrentPriceChange?: (value: number) => void;
  /** Explicit chart height in logical pixels. When provided, bypasses flex measurement. */
  height?: number;
}
