import type { Provider, RampsOrder } from '@metamask/ramps-controller';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { FiatOrder, V2FiatOrderData } from '../../../../reducers/fiatOrders';
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
 * Extracts the provider code and order code from a FiatOrder.
 *
 * V2 orders have IDs in the format "/providers/{providerCode}/orders/{orderCode}".
 * Aggregator orders store the provider in order.data.provider.
 */
function extractProviderAndOrderCode(order: FiatOrder): {
  providerCode: string;
  orderCode: string;
} {
  // V2-style IDs: /providers/transak-native/orders/abc123
  if (order.id.startsWith('/providers/')) {
    const parts = order.id.split('/');
    // parts = ['', 'providers', 'transak-native', 'orders', 'abc123']
    return { providerCode: parts[2] || '', orderCode: parts[4] || '' };
  }

  // Aggregator orders: provider is in the data
  const data = order.data as Record<string, unknown> | undefined;
  let providerCode = '';

  if (data?.provider) {
    const provider = data.provider as Partial<Provider>;
    if (provider.id) {
      providerCode = provider.id;
    }
  }

  // Normalise paths like "/providers/moonpay" → "moonpay"
  if (providerCode.startsWith('/providers/')) {
    providerCode = providerCode.split('/')[2] || providerCode;
  }

  return { providerCode, orderCode: order.id };
}

/**
 * Converts a V2 RampsOrder to a FiatOrder for Redux storage.
 *
 * Preserves the original order.data so legacy detail screens still work,
 * merges fields the V2 API updates between polls, and attaches the full V2
 * response as _v2Order for V2-aware screens.
 */
function rampsOrderToFiatOrder(
  rampsOrder: RampsOrder,
  originalOrder: FiatOrder,
): FiatOrder {
  const fiatCurrency = rampsOrder.fiatCurrency;
  const cryptoCurrency = rampsOrder.cryptoCurrency;
  const provider = rampsOrder.provider;
  const paymentMethod = rampsOrder.paymentMethod;

  return {
    id: originalOrder.id,
    provider: originalOrder.provider,
    createdAt: rampsOrder.createdAt,
    amount: rampsOrder.fiatAmount,
    fee: rampsOrder.totalFeesFiat,
    cryptoAmount: rampsOrder.cryptoAmount || 0,
    cryptoFee: rampsOrder.totalFeesFiat || 0,
    currency: fiatCurrency?.symbol || originalOrder.currency,
    currencySymbol:
      fiatCurrency?.denomSymbol || originalOrder.currencySymbol || '',
    cryptocurrency: cryptoCurrency?.symbol || originalOrder.cryptocurrency,
    network: rampsOrder.network?.chainId || originalOrder.network,
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
      // Merge fields that the V2 API may update between polls.
      provider: provider
        ? {
            id: provider.id,
            name: provider.name,
            links: provider.links,
          }
        : undefined,
      txHash: rampsOrder.txHash,
      pollingSecondsMinimum: rampsOrder.pollingSecondsMinimum,
      statusDescription: rampsOrder.statusDescription,
      timeDescriptionPending: rampsOrder.timeDescriptionPending,
      exchangeRate: rampsOrder.exchangeRate,
      fiatAmountInUsd: rampsOrder.fiatAmountInUsd,
      cryptoAmount: rampsOrder.cryptoAmount,
      fiatAmount: rampsOrder.fiatAmount,
      totalFeesFiat: rampsOrder.totalFeesFiat,
      providerOrderLink: rampsOrder.providerOrderLink,
      // SDK-compatible shape so the legacy OrderDetails component can render
      // amounts and fees. Uses real decimals and denomSymbol from the API.
      fiatCurrency: fiatCurrency
        ? {
            id: fiatCurrency.symbol,
            symbol: fiatCurrency.symbol,
            denomSymbol: fiatCurrency.denomSymbol,
            decimals: fiatCurrency.decimals,
          }
        : undefined,
      cryptoCurrency: cryptoCurrency
        ? {
            id: cryptoCurrency.symbol,
            symbol: cryptoCurrency.symbol,
            decimals: cryptoCurrency.decimals,
          }
        : undefined,
      providerOrderId: rampsOrder.providerOrderId,
      paymentMethod: paymentMethod
        ? {
            id: paymentMethod.id,
            name: paymentMethod.name,
          }
        : undefined,
      // Full V2 response for V2-aware order detail screens.
      _v2Order: rampsOrder as unknown as Record<string, unknown>,
    } as V2FiatOrderData,
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

    const transformedOrder = rampsOrderToFiatOrder(updatedOrder, order);

    return {
      ...order,
      ...transformedOrder,
      id: order.id,
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
