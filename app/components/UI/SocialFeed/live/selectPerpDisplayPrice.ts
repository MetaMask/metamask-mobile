/**
 * The two prices a perps quote can carry. `markPrice` is the exchange oracle.
 * `price` is the live mid.
 */
export interface PerpPriceQuote {
  price?: string;
  markPrice?: string;
  /**
   * `false` when the oracle has diverged from the mid far enough that the
   * venue would reject an order. Absent on quotes that have not been assessed.
   */
  isTradable?: boolean;
}

const parsePositivePrice = (value: string | undefined): number | undefined => {
  if (value == null) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Price an open perps card should show.
 *
 * The card follows the oracle when it is present and the venue still considers
 * the market tradable. A divergent oracle is what flashes a wrong price and
 * P&L on the feed while a copy trade is preparing (TSA-1655); the live mid is
 * the figure the trade sheet keeps showing, so the card stays on that mid.
 */
export const selectPerpDisplayPrice = (
  update: PerpPriceQuote,
): number | undefined => {
  const mid = parsePositivePrice(update.price);
  const oracle = parsePositivePrice(update.markPrice);
  if (oracle == null || update.isTradable === false) {
    return mid;
  }
  return oracle;
};
