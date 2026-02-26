import { renderNumber } from '../../../../util/number';
import { FiatOrder } from '../../../../reducers/fiatOrders';

// order.cryptoAmount is already in human-readable form (e.g. 0.05 ETH),
// so format it directly without any unit conversion.
export function getOrderAmount(order: FiatOrder) {
  if (!order.cryptoAmount) return '...';
  return renderNumber(String(order.cryptoAmount));
}
