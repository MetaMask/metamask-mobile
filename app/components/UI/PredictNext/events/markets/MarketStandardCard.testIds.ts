export const MarketStandardCardTestIds = {
  TITLE_PATTERN: /^predict-next-market-.+-title$/,
  card: (marketId: string) => `predict-next-market-${marketId}`,
  title: (marketId: string) => `predict-next-market-${marketId}-title`,
  row: (marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-${marketId}-${side}-row`,
  line: (marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-${marketId}-${side}-line`,
  yesButton: (marketId: string) => `predict-next-market-${marketId}-yes`,
  noButton: (marketId: string) => `predict-next-market-${marketId}-no`,
} as const;
