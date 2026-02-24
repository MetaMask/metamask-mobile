import {
  renderFromTokenMinimalUnit,
  renderNumber,
  toTokenMinimalUnit,
} from '../../../../util/number';
import { FiatOrder } from '../../../../reducers/fiatOrders';

export function getOrderAmount(order: FiatOrder) {
  let amount = '...';
  if (order.cryptoAmount) {
    const data = order?.data as
      | { cryptoCurrency?: { decimals?: number } }
      | undefined;
    if (data?.cryptoCurrency?.decimals !== undefined && order.cryptocurrency) {
      amount = renderFromTokenMinimalUnit(
        toTokenMinimalUnit(
          order.cryptoAmount,
          data.cryptoCurrency.decimals,
        ).toString(),
        data.cryptoCurrency.decimals,
      );
    } else {
      amount = renderNumber(String(order.cryptoAmount));
    }
  }
  return amount;
}
