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
