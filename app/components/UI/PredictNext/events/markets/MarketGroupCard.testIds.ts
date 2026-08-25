export const MarketGroupCardTestIds = {
  card: (groupKey: string) => `predict-next-market-group-${groupKey}`,
  title: (groupKey: string) => `predict-next-market-group-${groupKey}-title`,
  selector: (groupKey: string) =>
    `predict-next-market-group-${groupKey}-selector`,
  option: (groupKey: string, marketId: string) =>
    `predict-next-market-group-${groupKey}-option-${marketId}`,
  row: (groupKey: string, marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-group-${groupKey}-${marketId}-${side}-row`,
  outcomeButton: (groupKey: string, marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-group-${groupKey}-${marketId}-${side}`,
  rulesButton: (groupKey: string) =>
    `predict-next-market-group-${groupKey}-rules-button`,
} as const;
