export const EventMarketListTestIds = {
  ROOT: 'predict-next-event-market-list',
  TABS: 'predict-next-event-market-list-tabs',
  MARKETS_TAB: 'predict-next-event-market-list-markets-tab',
  POSITIONS_TAB: 'predict-next-event-market-list-positions-tab',
  layoutTab: (tabKey: string) =>
    `predict-next-event-market-list-layout-tab-${tabKey}`,
  POSITION_ROWS: /^predict-next-event-market-list-position-/,
  positionRow: (marketId: string, side: string) =>
    `predict-next-event-market-list-position-${marketId}-${side}`,
  positionCashOut: (marketId: string, side: string) =>
    `predict-next-event-market-list-cash-out-${marketId}-${side}`,
  positionBuy: (marketId: string, side: string) =>
    `predict-next-event-market-list-buy-${marketId}-${side}`,
  positionValue: (marketId: string, side: string) =>
    `predict-next-event-market-list-value-${marketId}-${side}`,
  positionPnl: (marketId: string, side: string) =>
    `predict-next-event-market-list-pnl-${marketId}-${side}`,
  positionChance: (marketId: string, side: string) =>
    `predict-next-event-market-list-chance-${marketId}-${side}`,
} as const;
