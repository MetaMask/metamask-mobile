import type { PredictMarketHistoryRange } from '../../../types';

export const PredictMarketHistoryTestIds = {
  VIEW: 'predict-market-history',
  LOADING: 'predict-market-history-loading',
  ERROR: 'predict-market-history-error',
  ERROR_MESSAGE: 'predict-market-history-error-message',
  RETRY: 'predict-market-history-retry',
  EMPTY: 'predict-market-history-empty',
  EMPTY_MESSAGE: 'predict-market-history-empty-message',
  CHART: 'predict-market-history-chart',
  RANGES: 'predict-market-history-ranges',
  range: (range: PredictMarketHistoryRange) =>
    `predict-market-history-range-${range}`,
  chartLabel: (id: string) => `predict-market-history-chart-label-${id}`,
  chartValue: (id: string) => `predict-market-history-chart-value-${id}`,
} as const;
