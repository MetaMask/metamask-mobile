import type { RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';

/**
 * Maps a V2 unified order status string to a FiatOrder state.
 */
export function orderStatusToFiatOrderState(status: string): FIAT_ORDER_STATES {
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
}

/**
 * Converts a V2 RampsOrder to a FiatOrder for Redux storage and activity mapping.
 */
export function rampsOrderToFiatOrder(rampsOrder: RampsOrder): FiatOrder {
  return {
    id: rampsOrder.providerOrderId || rampsOrder.id || '',
    provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
    createdAt: rampsOrder.createdAt,
    amount: rampsOrder.fiatAmount,
    fee: rampsOrder.totalFeesFiat,
    cryptoAmount: rampsOrder.cryptoAmount || 0,
    cryptoFee: rampsOrder.totalFeesFiat || 0,
    currency: rampsOrder.fiatCurrency?.symbol || '',
    currencySymbol: rampsOrder.fiatCurrency?.denomSymbol || '',
    amountInUSD: rampsOrder.fiatAmountInUsd?.toString(),
    cryptocurrency: rampsOrder.cryptoCurrency?.symbol || '',
    network:
      rampsOrder.cryptoCurrency?.chainId || rampsOrder.network?.chainId || '',
    state: orderStatusToFiatOrderState(rampsOrder.status),
    account: rampsOrder.walletAddress,
    txHash: rampsOrder.txHash,
    excludeFromPurchases: rampsOrder.excludeFromPurchases,
    orderType: rampsOrder.orderType as FiatOrder['orderType'],
    errorCount: 0,
    lastTimeFetched: Date.now(),
    data: rampsOrder,
  };
}
