import type { PredictMarket, PredictSeries } from '../../types';

export interface PredictCryptoUpDownChartProps {
  market: PredictMarket & { series: PredictSeries };
  targetPrice?: number;
}
