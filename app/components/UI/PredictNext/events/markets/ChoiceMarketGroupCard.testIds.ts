/** The test IDs a choice card's parts take; the Moneyline card passes its own. */
export interface ChoiceMarketGroupCardTestIdSet {
  card: (groupKey: string) => string;
  row: (groupKey: string, marketId: string) => string;
  line: (groupKey: string, marketId: string) => string;
  price: (groupKey: string, marketId: string) => string;
}

export const ChoiceMarketGroupCardTestIds = {
  card: (groupKey: string) => `predict-next-choice-${groupKey}`,
  title: (groupKey: string) => `predict-next-choice-${groupKey}-title`,
  row: (groupKey: string, marketId: string) =>
    `predict-next-choice-${groupKey}-${marketId}`,
  line: (groupKey: string, marketId: string) =>
    `predict-next-choice-${groupKey}-${marketId}-line`,
  price: (groupKey: string, marketId: string) =>
    `predict-next-choice-${groupKey}-${marketId}-price`,
} as const;
