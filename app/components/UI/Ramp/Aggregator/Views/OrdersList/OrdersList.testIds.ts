export type RampsOrderTypeSlug = 'buy' | 'sell' | 'deposit';

export const getOrderRowTestId = (type: RampsOrderTypeSlug, index: number) =>
  `orders-list-row-${type}-${index}`;

export const getOrderRowCryptoAmountTestId = (
  type: RampsOrderTypeSlug,
  index: number,
) => `orders-list-crypto-amount-${type}-${index}`;

export const getOrderRowFiatAmountTestId = (
  type: RampsOrderTypeSlug,
  index: number,
) => `orders-list-fiat-amount-${type}-${index}`;
