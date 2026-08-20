export const PredictEventDetailTestIds = {
  VIEW: 'predict-next-detail',
  BACK: 'predict-next-detail-back',
  LOADING: 'predict-next-detail-loading',
  ERROR: 'predict-next-detail-error',
  MARKETS: 'predict-next-detail-markets',
  market: (marketId: string) => `predict-next-detail-market-${marketId}`,
} as const;
