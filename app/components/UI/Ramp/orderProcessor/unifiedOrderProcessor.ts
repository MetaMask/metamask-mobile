import {
  normalizeProviderCode,
  type RampsOrder,
} from '@metamask/ramps-controller';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import type { ProcessorOptions } from '../index';
import {
  orderStatusToFiatOrderState,
  rampsOrderToFiatOrder,
} from '../utils/rampsOrderToFiatOrder';

export { orderStatusToFiatOrderState, rampsOrderToFiatOrder };

export const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
export const POLLING_FREQUENCY_IN_SECONDS = POLLING_FREQUENCY / 1000;
export const MAX_ERROR_COUNT = 5;

/**
 * Unified order processor that uses the V2 API via RampsController.getOrder.
 *
 * Includes exponential backoff on errors and pollingSecondsMinimum support.
 */
export async function processUnifiedOrder(
  order: FiatOrder,
  options?: ProcessorOptions,
): Promise<FiatOrder> {
  const now = Date.now();

  // Exponential backoff on errors
  if (
    options?.forced !== true &&
    order.errorCount &&
    order.lastTimeFetched &&
    order.errorCount > 0 &&
    order.lastTimeFetched +
      Math.pow(POLLING_FREQUENCY_IN_SECONDS, order.errorCount + 1) * 1000 >
      now
  ) {
    return order;
  }

  // Respect pollingSecondsMinimum from order data
  if (
    options?.forced !== true &&
    ((order.data as RampsOrder)?.pollingSecondsMinimum ?? 0) > 0 &&
    order.lastTimeFetched &&
    order.lastTimeFetched +
      ((order.data as RampsOrder)?.pollingSecondsMinimum ?? 0) * 1000 >
      now
  ) {
    return order;
  }

  try {
    const data = order.data as RampsOrder;
    const orderCode = data.providerOrderId;
    const providerCode = normalizeProviderCode(data.provider?.id ?? '');

    if (!providerCode || !orderCode) {
      throw new Error(
        `Cannot extract provider/order code from order ${order.id}`,
      );
    }

    const updatedOrder = await Engine.context.RampsController.getOrder(
      providerCode,
      orderCode,
      order.account,
    );

    if (!updatedOrder) {
      throw new Error('Order not found');
    }

    // Handle unknown status: increment error count and wait for retry.
    // Cap at MAX_ERROR_COUNT to prevent the exponential backoff from growing
    // indefinitely and making the order unresponsive.
    if (options?.forced !== true && updatedOrder.status === 'UNKNOWN') {
      return {
        ...order,
        lastTimeFetched: Date.now(),
        errorCount: Math.min((order.errorCount || 0) + 1, MAX_ERROR_COUNT),
      };
    }

    const transformedOrder = rampsOrderToFiatOrder(updatedOrder);

    // Only clear forceUpdate for terminal states
    const isTerminalState =
      transformedOrder.state === FIAT_ORDER_STATES.COMPLETED ||
      transformedOrder.state === FIAT_ORDER_STATES.FAILED ||
      transformedOrder.state === FIAT_ORDER_STATES.CANCELLED;

    return {
      ...order,
      ...transformedOrder,
      id: order.id || transformedOrder.id,
      network: order.network || transformedOrder.network,
      account: order.account || transformedOrder.account,
      lastTimeFetched: now,
      errorCount: 0,
      forceUpdate: isTerminalState ? false : order.forceUpdate,
    };
  } catch (error) {
    Logger.error(error as Error, {
      message: 'FiatOrders::UnifiedProcessor error while processing order',
      orderId: order.id,
    });
    return order;
  }
}
