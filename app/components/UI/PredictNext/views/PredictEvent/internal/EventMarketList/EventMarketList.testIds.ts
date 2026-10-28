export const EventMarketListTestIds = {
  ROOT: 'predict-next-event-market-list',
  TABS: 'predict-next-event-market-list-tabs',
  MARKETS_TAB: 'predict-next-event-market-list-markets-tab',
  POSITIONS_TAB: 'predict-next-event-market-list-positions-tab',
  POSITION_ROWS: /^predict-next-event-market-list-position-/,
  positionRow: (marketId: string, side: string) =>
    `predict-next-event-market-list-position-${marketId}-${side}`,
  positionCashOut: (marketId: string, side: string) =>
    `predict-next-event-market-list-cash-out-${marketId}-${side}`,
} as const;
