import { DepositOrder, OrderStatusEnum } from '@consensys/native-ramps-sdk';
import { ProcessorOptions } from '../..';
import { FiatOrder } from '../../../../../reducers/fiatOrders';

import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import transakNetworkToChainId from '../utils/transakNetworkToChainId';
import { getCryptoCurrencyFromTransakId } from '../utils';
import { DepositSDKNoAuth } from '../sdk';
import Logger from '../../../../../util/Logger';

const depositOrderStateToFiatOrderState = (
  aggregatorOrderState: DepositOrder['status'],
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
    case OrderStatusEnum.Created: {
      return FIAT_ORDER_STATES.CREATED;
    }
    case OrderStatusEnum.Pending:
    case OrderStatusEnum.Unknown:
    default: {
      return FIAT_ORDER_STATES.PENDING;
    }
  }
};

export const depositOrderToFiatOrder = (depositOrder: DepositOrder) => {
  const cryptoCurrency = getCryptoCurrencyFromTransakId(
    depositOrder.cryptoCurrency,
    depositOrder.network,
  );

  return {
    id: depositOrder.id,
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    createdAt: depositOrder.createdAt,
    amount: depositOrder.fiatAmount,
    fee: depositOrder.totalFeesFiat,
    cryptoAmount: depositOrder.cryptoAmount || 0,
    cryptoFee: depositOrder.totalFeesFiat || 0,
    currency: depositOrder.fiatCurrency,
    currencySymbol: '',
    cryptocurrency: depositOrder.cryptoCurrency,
    network:
      cryptoCurrency?.chainId || transakNetworkToChainId(depositOrder.network),
    state: depositOrderStateToFiatOrderState(depositOrder.status),
    account: depositOrder.walletAddress,
    txHash: depositOrder.txHash,
    excludeFromPurchases: false,
    orderType: depositOrder.orderType,
    errorCount: 0,
    lastTimeFetched: Date.now(),
    data: depositOrder,
  };
};

export async function processDepositOrder(
  order: FiatOrder,
  options?: ProcessorOptions,
): Promise<FiatOrder> {
  try {
    const sdk = options?.sdk || DepositSDKNoAuth;

    const updatedOrder = await sdk.getOrder(order.id, order.account);
    if (!updatedOrder) {
      throw new Error('Deposit order not found');
    }

    const updatedFiatOrder = depositOrderToFiatOrder(updatedOrder);
    return {
      ...updatedFiatOrder,
      account: order.account,
      network: order.network,
      lastTimeFetched: Date.now(),
      errorCount: 0,
    };
  } catch (error) {
    Logger.error(error as Error, {
      message: 'DepositOrder::Processor error while processing order',
      order,
    });
    return order;
  }
}
