import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import type { FiatOrder } from '../../reducers/fiatOrders';

/**
 * Maps unified V2 `RampsOrder.orderType` strings into `FiatOrder.orderType`.
 * The V2 API and controller stubs may use "buy" / "BUY"; UI and analytics
 * historically expected {@link OrderOrderTypeEnum.Buy} ("BUY") only.
 */
export function normalizeRampsOrderTypeForFiatOrder(
  orderType: string | undefined,
): FiatOrder['orderType'] {
  const upper = String(orderType ?? '').toUpperCase();
  if (upper === 'SELL') {
    return OrderOrderTypeEnum.Sell;
  }
  if (upper === 'TRANSFER') {
    return OrderOrderTypeEnum.Transfer;
  }
  if (upper === 'BUY' || upper === '') {
    return OrderOrderTypeEnum.Buy;
  }
  return orderType as FiatOrder['orderType'];
}

/** True when the order should use off-ramp analytics and UI treatment. */
export function isRampsOrderTypeSell(orderType: string | undefined): boolean {
  return String(orderType ?? '').trim().toUpperCase() === 'SELL';
}

/**
 * True for unified V2 on-ramp (purchase) analytics — matches
 * {@link normalizeRampsOrderTypeForFiatOrder} buy cases only, not "anything
 * that is not SELL".
 */
export function isRampsOrderTypeBuy(orderType: string | undefined): boolean {
  const upper = String(orderType ?? '').trim().toUpperCase();
  return upper === 'BUY' || upper === '';
}
