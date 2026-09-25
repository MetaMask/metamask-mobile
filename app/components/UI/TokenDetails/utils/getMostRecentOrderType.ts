import type { RecurringOrder } from '../../Bridge/api/recurringOrders.types';
import { BridgeTabKey } from '../../Bridge/Views/BridgeView/BridgeView.constants';

interface GetMostRecentOrderTypeParams {
  recurringOrder?: RecurringOrder;
}

type OrderType = BridgeTabKey.Limit | BridgeTabKey.Recurring;

export function getMostRecentOrderType({
  recurringOrder,
}: GetMostRecentOrderTypeParams): OrderType | undefined {
  // TODO: Accept the latest limit order and compare createdAt timestamps once
  // Token Details supports limit orders.
  return recurringOrder ? BridgeTabKey.Recurring : undefined;
}
