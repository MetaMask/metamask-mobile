import type { RampsOrder } from '@metamask/ramps-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { FiatOrder } from '../../../reducers/fiatOrders/types';

/**
 * Discriminates legacy fiat Redux orders from native RampsController orders.
 * FiatOrder.provider is a FIAT_ORDER_PROVIDERS string; RampsOrder.provider is
 * an object (or absent).
 */
export function isRampFiatOrder(
  data: FiatOrder | RampsOrder,
): data is FiatOrder {
  return typeof (data as FiatOrder).provider === 'string' && 'state' in data;
}

export function isRampRampsOrder(
  data: FiatOrder | RampsOrder,
): data is RampsOrder {
  return !isRampFiatOrder(data);
}
