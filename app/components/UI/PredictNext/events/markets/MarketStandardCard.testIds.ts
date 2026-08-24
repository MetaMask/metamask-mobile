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
  rulesButton: (marketId: string) =>
    `predict-next-market-${marketId}-rules-button`,
  rulesSheet: (marketId: string) =>
    `predict-next-market-${marketId}-rules-sheet`,
  rulesCloseButton: (marketId: string) =>
    `predict-next-market-${marketId}-rules-close`,
  rulesContent: (marketId: string) =>
    `predict-next-market-${marketId}-rules-content`,
  rulesSources: (marketId: string) =>
    `predict-next-market-${marketId}-rules-sources`,
  rulesSourceLink: (marketId: string, sourceIndex: number) =>
    `predict-next-market-${marketId}-rules-source-${sourceIndex}`,
  rulesText: (marketId: string) => `predict-next-market-${marketId}-rules-text`,
} as const;
