export const MarketGroupCardTestIds = {
  card: (groupKey: string) => `predict-next-market-group-${groupKey}`,
  title: (groupKey: string) => `predict-next-market-group-${groupKey}-title`,
  selector: (groupKey: string) =>
    `predict-next-market-group-${groupKey}-selector`,
  selectionMarker: (groupKey: string) =>
    `predict-next-market-group-${groupKey}-selection-marker`,
  option: (groupKey: string, marketId: string) =>
    `predict-next-market-group-${groupKey}-option-${marketId}`,
  row: (groupKey: string, marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-group-${groupKey}-${marketId}-${side}-row`,
  quoteBar: (groupKey: string, marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-group-${groupKey}-${marketId}-${side}-quote-bar`,
  outcomeButton: (groupKey: string, marketId: string, side: 'yes' | 'no') =>
    `predict-next-market-group-${groupKey}-${marketId}-${side}`,
  rulesButton: (groupKey: string) =>
    `predict-next-market-group-${groupKey}-rules-button`,
} as const;
