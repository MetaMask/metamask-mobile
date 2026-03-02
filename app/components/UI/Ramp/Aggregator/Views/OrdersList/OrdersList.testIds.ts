const ORDER_ROW_PREFIX = 'ramps-order';

export type RampsOrderTypeSlug = 'buy' | 'sell' | 'deposit';

export function getOrderRowTestId(
  orderType: RampsOrderTypeSlug,
  rowIndex: number,
): string {
  return `${ORDER_ROW_PREFIX}-${orderType}-${rowIndex}`;
}

export function getOrderRowCryptoAmountTestId(
  orderType: RampsOrderTypeSlug,
  rowIndex: number,
): string {
  return `${ORDER_ROW_PREFIX}-${orderType}-${rowIndex}-crypto-amount`;
}

export function getOrderRowFiatAmountTestId(
  orderType: RampsOrderTypeSlug,
  rowIndex: number,
): string {
  return `${ORDER_ROW_PREFIX}-${orderType}-${rowIndex}-fiat-amount`;
}
