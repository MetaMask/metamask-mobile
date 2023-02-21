import { SDK } from '../sdk';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { Order, OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { FiatOrder } from '../../../../reducers/fiatOrders';

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

interface InitialAggregatorOrder {
  id: string;
  account: string;
  network: string;
}

export const aggregatorInitialFiatOrder = (
  initialOrder: InitialAggregatorOrder,
) => ({
  ...initialOrder,
  state: FIAT_ORDER_STATES.PENDING,
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: Date.now(),
  amount: null,
  fee: null,
  currency: '',
  cryptoAmount: null,
  cryptocurrency: '',
  data: null,
});

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
  data: aggregatorOrder,
});

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processAggregatorOrder(
  order: ReturnType<typeof aggregatorOrderToFiatOrder> | InitialAggregatorOrder,
): Promise<FiatOrder> {
  try {
    const orders = await SDK.orders();
    const updatedOrder = await orders.getOrder(order.id, order.account);

    if (!updatedOrder) {
      throw new Error('Payment Request Failed: empty order response');
    }

    const transformedOrder = aggregatorOrderToFiatOrder(updatedOrder);

    return {
      ...order,
      ...transformedOrder,
      id: order.id || transformedOrder.id,
      network: order.network || transformedOrder.network,
      account: order.account || transformedOrder.account,
    };
  } catch (error) {
    Logger.error(error as Error, {
      message: 'FiatOrders::AggregatorProcessor error while processing order',
      order,
    });
    return order as FiatOrder;
  }
}
