/**
 * Order-form size denomination shared by Lite and Pro.
 * `asset` is the coin amount (BTC, ETH, …); USD stays the canonical order amount.
 * The choice itself lives in persisted settings.
 */
export type PerpsSizeDenomination = 'usd' | 'asset';

/**
 * Segment value for the `size_unit` analytics property.
 * Coin matches the order-form label; settings stores `asset`.
 */
export const toPerpsSizeUnitAnalyticsValue = (
  denomination: PerpsSizeDenomination,
): 'usd' | 'coin' => (denomination === 'asset' ? 'coin' : 'usd');

/**
 * A saved coin unit can be shown only once this price can project USD into coin.
 */
export const isPerpsCoinSizePriceReady = (price: number): boolean =>
  Number.isFinite(price) && price > 0;

/**
 * Unit actually on screen.
 *
 * A saved coin choice stays in USD until a positive price can project it, and
 * while a USD edit started before that price is still open. Full-screen Lite
 * has no coin toggle: pass `saved: 'usd'`.
 */
export const resolveShownPerpsSizeDenomination = ({
  saved,
  price,
  holdUsdEdit,
}: {
  saved: PerpsSizeDenomination;
  price: number;
  holdUsdEdit: boolean;
}): PerpsSizeDenomination => {
  if (saved === 'asset' && !holdUsdEdit && isPerpsCoinSizePriceReady(price)) {
    return 'asset';
  }
  return 'usd';
};
