export const LiveTradeRowSelectorsIDs = {
  ROW: 'live-trade-row',
  CARD: 'live-trade-card',
  HEADER: 'live-trade-header',
} as const;

export const getLiveTradeRowTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.ROW}-${id}`;

export const getLiveTradeCardTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.CARD}-${id}`;

export const getLiveTradeHeaderTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.HEADER}-${id}`;
