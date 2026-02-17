import type { RampsOrder } from '@metamask/ramps-controller';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import type { ProcessorOptions } from '../index';

export const POLLING_FREQUENCY = AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
export const POLLING_FREQUENCY_IN_SECONDS = POLLING_FREQUENCY / 1000;

/**
 * Maps a V2 unified order status string to a FiatOrder state.
 */
const orderStatusToFiatOrderState = (status: string): FIAT_ORDER_STATES => {
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
 * Extracts the crypto currency symbol from a RampsOrder.
 * The V2 API may return cryptoCurrency as a string or an object.
 */
function getCryptoSymbol(cryptoCurrency: RampsOrder['cryptoCurrency']): string {
  if (!cryptoCurrency) {
    return '';
  }
  if (typeof cryptoCurrency === 'string') {
    return cryptoCurrency;
  }
  return cryptoCurrency.symbol || '';
}

/**
 * Extracts the network chainId from a RampsOrder.
 * The V2 API may return network as a string or an object with chainId.
 */
function getNetworkChainId(network: RampsOrder['network']): string {
  if (!network) {
    return '';
  }
  if (typeof network === 'string') {
    return network;
  }
  return network.chainId || '';
}

/**
 * Extracts the provider code and order code from a FiatOrder.
 *
 * Deposit orders have IDs in the format "/providers/{providerCode}/orders/{orderCode}".
 * Aggregator orders store the provider in order.data.provider (as an object or string).
 */
function extractProviderAndOrderCode(order: FiatOrder): {
  providerCode: string;
  orderCode: string;
} {
  // Deposit-style IDs: /providers/transak-native/orders/abc123
  if (order.id.startsWith('/providers/')) {
    const parts = order.id.split('/');
    // parts = ['', 'providers', 'transak-native', 'orders', 'abc123']
    const providerCode = parts[2] || '';
    const orderCode = parts[4] || '';
    return { providerCode, orderCode };
  }

  // Aggregator orders: provider is in the data
  const data = order.data as Record<string, unknown> | undefined;
  let providerCode = '';
  if (data?.provider) {
    if (typeof data.provider === 'string') {
      providerCode = data.provider;
    } else if (
      typeof data.provider === 'object' &&
      data.provider !== null &&
      'id' in data.provider
    ) {
      providerCode = String(
        (data.provider as Record<string, unknown>).id || '',
      );
    }
  }

  // Extract just the provider code from paths like "/providers/moonpay"
  if (providerCode.startsWith('/providers/')) {
    providerCode = providerCode.split('/')[2] || providerCode;
  }

  return { providerCode, orderCode: order.id };
}

/**
 * Converts a V2 RampsOrder to a FiatOrder for Redux storage.
 * Uses the original order's provider type to maintain routing consistency.
 *
 * Data strategy:
 * - We preserve the original `order.data` structure (SDK Order / DepositOrder)
 * so that existing detail screens and analytics that cast to those types
 * still work for orders that were originally created via the old flows.
 * - We merge primitive fields that the V2 API updates (txHash, amounts, etc.)
 * into the spread so those values stay fresh.
 * - We attach the full V2 response as `_v2Order` so that V2-aware screens
 * (the new unified order details) can read the complete data directly
 * without relying on the legacy SDK shape.
 */
function rampsOrderToFiatOrder(
  rampsOrder: RampsOrder,
  originalOrder: FiatOrder,
): FiatOrder {
  return {
    id: originalOrder.id,
    provider: originalOrder.provider,
    createdAt: rampsOrder.createdAt,
    amount: rampsOrder.fiatAmount,
    fee: rampsOrder.totalFeesFiat,
    cryptoAmount: rampsOrder.cryptoAmount || 0,
    cryptoFee: rampsOrder.totalFeesFiat || 0,
    currency: rampsOrder.fiatCurrency || originalOrder.currency,
    currencySymbol: originalOrder.currencySymbol || '',
    cryptocurrency:
      getCryptoSymbol(rampsOrder.cryptoCurrency) ||
      originalOrder.cryptocurrency,
    network: getNetworkChainId(rampsOrder.network) || originalOrder.network,
    state: orderStatusToFiatOrderState(rampsOrder.status),
    account: rampsOrder.walletAddress || originalOrder.account,
    txHash: rampsOrder.txHash,
    excludeFromPurchases: rampsOrder.excludeFromPurchases,
    orderType: rampsOrder.orderType as FiatOrder['orderType'],
    errorCount: 0,
    lastTimeFetched: Date.now(),
    data: {
      // Spread original SDK data so legacy detail screens / analytics still work.
      ...(originalOrder.data as Record<string, unknown>),
      // Merge primitive fields the V2 API may update between polls.
      txHash: rampsOrder.txHash,
      pollingSecondsMinimum: rampsOrder.pollingSecondsMinimum,
      statusDescription: rampsOrder.statusDescription,
      timeDescriptionPending: rampsOrder.timeDescriptionPending,
      exchangeRate: rampsOrder.exchangeRate,
      fiatAmountInUsd: rampsOrder.fiatAmountInUsd,
      cryptoAmount: rampsOrder.cryptoAmount,
      fiatAmount: rampsOrder.fiatAmount,
      totalFeesFiat: rampsOrder.totalFeesFiat,
      // Full V2 response for V2-aware order detail screens.
      _v2Order: rampsOrder,
    } as unknown as FiatOrder['data'],
  };
}

/**
 * Unified order processor that uses the V2 API via RampsController.getOrder.
 * Replaces both processAggregatorOrder and processDepositOrder.
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
  const pollingMinimum = (order.data as Record<string, unknown>)
    ?.pollingSecondsMinimum;
  if (
    options?.forced !== true &&
    typeof pollingMinimum === 'number' &&
    pollingMinimum > 0 &&
    order.lastTimeFetched &&
    order.lastTimeFetched + pollingMinimum * 1000 > now
  ) {
    return order;
  }

  try {
    const { providerCode, orderCode } = extractProviderAndOrderCode(order);

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

    // Handle unknown status: increment error count
    if (options?.forced !== true && updatedOrder.status === 'UNKNOWN') {
      return {
        ...order,
        lastTimeFetched: Date.now(),
        errorCount: (order.errorCount || 0) + 1,
      };
    }

    const transformedOrder = rampsOrderToFiatOrder(updatedOrder, order);

    return {
      ...order,
      ...transformedOrder,
      id: order.id,
      network: transformedOrder.network || order.network,
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
