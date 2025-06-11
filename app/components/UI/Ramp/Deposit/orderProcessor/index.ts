import { ProcessorOptions } from '../..';
import { FiatOrder } from '../../../../../reducers/fiatOrders';

export async function processDepositOrder(
  order: FiatOrder,
  _options?: ProcessorOptions,
): Promise<FiatOrder> {
  // TODO: Implement the logic for processing deposit orders.
  return order;
}
