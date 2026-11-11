export const PredictTrendingTestIds = {
  /** A search result row; the same ID the Polymarket row uses. */
  searchRow: (marketId: string) => `predict-market-row-item-${marketId}`,
} as const;
