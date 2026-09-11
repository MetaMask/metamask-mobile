export const MarketFooterCardTestIds = {
  ROOT: 'predict-next-market-footer',
  button: (selection: 'away' | 'home' | 'draw') =>
    `predict-next-market-footer-${selection}`,
} as const;
