import {
  isLimitExecutionOrderType,
  isTriggerOrderType,
  type OrderType,
} from '@metamask/perps-controller';

/**
 * Selects standard market/resting-order toast copy for the Lite form, which
 * does not expose strategy order types.
 */
export const getStandardOrderManagementToastKey = (
  orderType: OrderType | undefined,
): 'market' | 'limit' =>
  orderType !== undefined &&
  (isLimitExecutionOrderType(orderType) || isTriggerOrderType(orderType))
    ? 'limit'
    : 'market';
