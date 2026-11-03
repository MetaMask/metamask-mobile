export const MoneylineMarketGroupCardTestIds = {
  card: (groupKey: string) => `predict-next-moneyline-${groupKey}`,
  row: (groupKey: string, marketId: string) =>
    `predict-next-moneyline-${groupKey}-${marketId}`,
  logo: (groupKey: string, marketId: string) =>
    `predict-next-moneyline-${groupKey}-${marketId}-logo`,
  logoFallback: (groupKey: string, marketId: string) =>
    `predict-next-moneyline-${groupKey}-${marketId}-logo-fallback`,
  line: (groupKey: string, marketId: string) =>
    `predict-next-moneyline-${groupKey}-${marketId}-line`,
  price: (groupKey: string, marketId: string) =>
    `predict-next-moneyline-${groupKey}-${marketId}-price`,
} as const;
