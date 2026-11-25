import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import { OrderType } from '../../types/advancedOrders';

export const getOrderTypeFromTrigger = (
  trigger: LimitOrder['trigger'],
): OrderType =>
  ({
    src_price: {
      above: OrderType.SELL_ABOVE,
      below: OrderType.SELL_BELOW,
    },
    dest_price: {
      above: OrderType.BUY_ABOVE,
      below: OrderType.BUY_BELOW,
    },
    ratio: {
      above: OrderType.BUY_ABOVE,
      below: OrderType.BUY_BELOW,
    },
  })[trigger.kind][trigger.threshold];
