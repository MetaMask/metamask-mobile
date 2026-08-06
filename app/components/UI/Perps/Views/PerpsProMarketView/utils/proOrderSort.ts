import type { Order } from '@metamask/perps-controller';
import { resolveOrderDisplayPriceAndLabel } from '../../../utils/orderUtils';

export type ProOrderSortField = 'orderValue' | 'size' | 'price' | 'time';

export type ProOrderSortDirection = 'asc' | 'desc';

export interface ProOrderSortConfig {
  field: ProOrderSortField;
  direction: ProOrderSortDirection;
}

export const DEFAULT_PRO_ORDER_SORT: ProOrderSortConfig = {
  field: 'time',
  direction: 'desc',
};

export const PRO_ORDER_SORT_OPTIONS: {
  id: ProOrderSortField;
  labelKey: string;
}[] = [
  {
    id: 'orderValue',
    labelKey: 'perps.pro_positions_panel.sort.order_value',
  },
  {
    id: 'size',
    labelKey: 'perps.pro_positions_panel.sort.size',
  },
  {
    id: 'price',
    labelKey: 'perps.pro_positions_panel.sort.price',
  },
  {
    id: 'time',
    labelKey: 'perps.pro_positions_panel.sort.time',
  },
];

const getOrderSize = (order: Order): number =>
  Math.abs(Number.parseFloat(order.originalSize || order.size)) || 0;

const getOrderPrice = (order: Order): number =>
  resolveOrderDisplayPriceAndLabel(order).priceValue ?? 0;

const getSortValue = (order: Order, field: ProOrderSortField): number => {
  switch (field) {
    case 'orderValue':
      return getOrderSize(order) * getOrderPrice(order);
    case 'size':
      return getOrderSize(order);
    case 'price':
      return getOrderPrice(order);
    case 'time':
      return order.timestamp ?? 0;
    default:
      return 0;
  }
};

/**
 * Returns a new array of orders sorted by the selected field and direction.
 */
export const sortProOrders = (
  orders: Order[],
  config: ProOrderSortConfig,
): Order[] => {
  const multiplier = config.direction === 'asc' ? 1 : -1;

  return [...orders].sort((left, right) => {
    const leftValue = getSortValue(left, config.field);
    const rightValue = getSortValue(right, config.field);

    if (leftValue === rightValue) {
      return left.orderId.localeCompare(right.orderId);
    }

    return (leftValue - rightValue) * multiplier;
  });
};
