export const LiveTradeRowSelectorsIDs = {
  ROW: 'live-trade-row',
  CARD: 'live-trade-card',
  AMOUNT: 'live-trade-amount',
  VALUE: 'live-trade-value',
  MARK_PRICE: 'live-trade-mark-price',
} as const;

export const getLiveTradeRowTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.ROW}-${id}`;

export const getLiveTradeCardTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.CARD}-${id}`;

export const getLiveTradeAmountTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.AMOUNT}-${id}`;

export const getLiveTradeValueTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.VALUE}-${id}`;

export const getLiveTradeMarkPriceTestId = (id: string) =>
  `${LiveTradeRowSelectorsIDs.MARK_PRICE}-${id}`;
