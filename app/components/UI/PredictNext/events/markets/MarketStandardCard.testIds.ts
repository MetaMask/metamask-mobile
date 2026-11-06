export const MarketStandardCardTestIds = {
  TITLE_PATTERN: /^predict-next-market-.+-title$/,
  card: (marketId: string) => `predict-next-market-${marketId}`,
  title: (marketId: string) => `predict-next-market-${marketId}-title`,
  volume: (marketId: string) => `predict-next-market-${marketId}-volume`,
  percentage: (marketId: string) =>
    `predict-next-market-${marketId}-percentage`,
  bar: (marketId: string) => `predict-next-market-${marketId}-bar`,
  barYes: (marketId: string) => `predict-next-market-${marketId}-bar-yes`,
  barNo: (marketId: string) => `predict-next-market-${marketId}-bar-no`,
  yesButton: (marketId: string) => `predict-next-market-${marketId}-yes`,
  noButton: (marketId: string) => `predict-next-market-${marketId}-no`,
} as const;
