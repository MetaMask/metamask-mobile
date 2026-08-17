import type { PredictMarketHistoryRange } from '../../types';

export const PredictMarketHistoryTestIds = {
  VIEW: 'predict-market-history',
  LOADING: 'predict-market-history-loading',
  ERROR: 'predict-market-history-error',
  EMPTY: 'predict-market-history-empty',
  CHART: 'predict-market-history-chart',
  RANGES: 'predict-market-history-ranges',
  range: (range: PredictMarketHistoryRange) =>
    `predict-market-history-range-${range}`,
} as const;
