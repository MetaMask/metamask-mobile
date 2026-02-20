import type { RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import type { ProcessorOptions } from '../index';

export const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
export const POLLING_FREQUENCY_IN_SECONDS = POLLING_FREQUENCY / 1000;
export const MAX_ERROR_COUNT = 5;

/**
 * Maps a V2 unified order status string to a FiatOrder state.
 */
export const orderStatusToFiatOrderState = (
  status: string,
): FIAT_ORDER_STATES => {
  switch (status) {
    case 'COMPLETED':
      return FIAT_ORDER_STATES.COMPLETED;
    case 'FAILED':
      return FIAT_ORDER_STATES.FAILED;
    case 'CANCELLED':
      return FIAT_ORDER_STATES.CANCELLED;
    case 'CREATED':
      return FIAT_ORDER_STATES.CREATED;
    case 'PENDING':
    case 'UNKNOWN':
    default:
      return FIAT_ORDER_STATES.PENDING;
  }
};

/**
 * Converts a V2 RampsOrder to a FiatOrder for Redux storage.
 */
export const rampsOrderToFiatOrder = (rampsOrder: RampsOrder) => ({
  id: rampsOrder.id || '',
  provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
  createdAt: rampsOrder.createdAt,
  amount: rampsOrder.fiatAmount,
  fee: rampsOrder.totalFeesFiat,
  cryptoAmount: rampsOrder.cryptoAmount || 0,
  cryptoFee: rampsOrder.totalFeesFiat || 0,
  currency: rampsOrder.fiatCurrency?.symbol || '',
  currencySymbol: rampsOrder.fiatCurrency?.denomSymbol || '',
  cryptocurrency: rampsOrder.cryptoCurrency?.symbol || '',
  network: rampsOrder.network?.chainId || '',
  state: orderStatusToFiatOrderState(rampsOrder.status),
  account: rampsOrder.walletAddress,
  txHash: rampsOrder.txHash,
  excludeFromPurchases: rampsOrder.excludeFromPurchases,
  orderType: rampsOrder.orderType as FiatOrder['orderType'],
  errorCount: 0,
  lastTimeFetched: Date.now(),
  data: rampsOrder,
});

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
    const providerCode = data.provider?.id?.replace('/providers/', '') ?? '';

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

    return {
      ...order,
      ...transformedOrder,
      id: order.id || transformedOrder.id,
      network: order.network || transformedOrder.network,
      account: order.account || transformedOrder.account,
      lastTimeFetched: now,
      errorCount: 0,
      forceUpdate: false,
    };
  } catch (error) {
    Logger.error(error as Error, {
      message: 'FiatOrders::UnifiedProcessor error while processing order',
      orderId: order.id,
    });
    return order;
  }
}
