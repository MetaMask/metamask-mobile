import { SDK } from '../sdk';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { Order, OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import AppConstants from '../../../../core/AppConstants';
import { ProcessorOptions } from '..';

export const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
export const POLLING_FRECUENCY_IN_SECONDS = POLLING_FREQUENCY / 1000;
export const MAX_ERROR_COUNT = 5;

/**
 * Transforms an AggregatorOrder state into a FiatOrder state
 * @param {AGGREGATOR_ORDER_STATES} aggregatorOrderState
 */
const aggregatorOrderStateToFiatOrderState = (
  aggregatorOrderState: Order['status'],
) => {
  switch (aggregatorOrderState) {
    case OrderStatusEnum.Completed: {
      return FIAT_ORDER_STATES.COMPLETED;
    }
    case OrderStatusEnum.Failed: {
      return FIAT_ORDER_STATES.FAILED;
    }
    case OrderStatusEnum.Cancelled: {
      return FIAT_ORDER_STATES.CANCELLED;
    }
    case OrderStatusEnum.Pending:
    case OrderStatusEnum.Unknown:
    default: {
      return FIAT_ORDER_STATES.PENDING;
    }
  }
};

export const aggregatorOrderToFiatOrder = (aggregatorOrder: Order) => ({
  id: aggregatorOrder.id,
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: aggregatorOrder.createdAt,
  amount: aggregatorOrder.fiatAmount,
  fee: aggregatorOrder.totalFeesFiat,
  cryptoAmount: aggregatorOrder.cryptoAmount || 0,
  cryptoFee: aggregatorOrder.totalFeesFiat || 0,
  currency: aggregatorOrder.fiatCurrency?.symbol || '',
  currencySymbol: aggregatorOrder.fiatCurrency?.denomSymbol || '',
  cryptocurrency: aggregatorOrder.cryptoCurrency?.symbol || '',
  network:
    aggregatorOrder.network ||
    String(aggregatorOrder.cryptoCurrency?.network?.chainId),
  state: aggregatorOrderStateToFiatOrderState(aggregatorOrder.status),
  account: aggregatorOrder.walletAddress,
  txHash: aggregatorOrder.txHash,
  excludeFromPurchases: aggregatorOrder.excludeFromPurchases,
  orderType: aggregatorOrder.orderType,
  errorCount: 0,
  lastTimeFetched: Date.now(),
  data: aggregatorOrder,
});

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processAggregatorOrder(
  order: FiatOrder | ReturnType<typeof aggregatorOrderToFiatOrder>,
  options?: ProcessorOptions,
): Promise<FiatOrder> {
  const now = Date.now();

  /**
   * If the order had errors, we don't fetch it unless
   * POLLING_FRECUENCY ^ (errorCount + 1) seconds has passed
   */
  if (
    options?.forced !== true &&
    order.errorCount &&
    order.lastTimeFetched &&
    order.errorCount > 0 &&
    order.lastTimeFetched +
      Math.pow(POLLING_FRECUENCY_IN_SECONDS, order.errorCount + 1) * 1000 >
      now
  ) {
    return order;
  }

  try {
    const orders = await SDK.orders();
    const updatedOrder = await orders.getOrder(order.id, order.account);

    if (!updatedOrder) {
      throw new Error('Payment Request Failed: empty order response');
    }

    if (
      options?.forced !== true &&
      updatedOrder.status === OrderStatusEnum.Unknown
    ) {
      return {
        ...order,
        lastTimeFetched: Date.now(),
        errorCount: (order.errorCount || 0) + 1,
      };
    }

    const transformedOrder = aggregatorOrderToFiatOrder(updatedOrder);

    return {
      ...order,
      ...transformedOrder,
      id: order.id || transformedOrder.id,
      network: order.network || transformedOrder.network,
      account: order.account || transformedOrder.account,
      lastTimeFetched: now,
      errorCount: 0,
    };
  } catch (error) {
    Logger.error(error as Error, {
      message: 'FiatOrders::AggregatorProcessor error while processing order',
      order,
    });
    return order as FiatOrder;
  }
}
