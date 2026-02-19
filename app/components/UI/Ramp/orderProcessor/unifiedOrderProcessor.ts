import type {
  RampsOrder,
  RampsOrderFiatCurrency,
  RampsOrderProvider,
} from '@metamask/ramps-controller';
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

// These helpers handle both legacy string paths (e.g. "/currencies/fiat/mxn")
// and the new full objects returned by the V2 API, so old orders cached in
// Redux continue to poll correctly after the API migration.

function getCryptoSymbol(cryptoCurrency: RampsOrder['cryptoCurrency']): string {
  if (!cryptoCurrency) return '';
  if (typeof cryptoCurrency === 'string') return cryptoCurrency;
  return cryptoCurrency.symbol || '';
}

function getCryptoDecimals(
  cryptoCurrency: RampsOrder['cryptoCurrency'],
): number {
  if (!cryptoCurrency || typeof cryptoCurrency === 'string') return 18;
  return cryptoCurrency.decimals ?? 18;
}

function getFiatCurrencyCode(fiatCurrency: RampsOrder['fiatCurrency']): string {
  if (!fiatCurrency) return '';
  if (typeof fiatCurrency === 'string') {
    const code = fiatCurrency.startsWith('/')
      ? fiatCurrency.split('/').pop() || ''
      : fiatCurrency;
    return code.toUpperCase();
  }
  return (fiatCurrency as RampsOrderFiatCurrency).symbol || '';
}

function getFiatCurrencyDecimals(
  fiatCurrency: RampsOrder['fiatCurrency'],
): number {
  if (!fiatCurrency || typeof fiatCurrency === 'string') return 2;
  return (fiatCurrency as RampsOrderFiatCurrency).decimals ?? 2;
}

function getFiatCurrencyDenomSymbol(
  fiatCurrency: RampsOrder['fiatCurrency'],
): string {
  if (!fiatCurrency || typeof fiatCurrency === 'string') return '';
  return (fiatCurrency as RampsOrderFiatCurrency).denomSymbol || '';
}

function getProviderData(
  provider: RampsOrder['provider'],
): RampsOrderProvider | undefined {
  if (!provider) return undefined;
  if (typeof provider === 'string') return { id: provider };
  return provider as RampsOrderProvider;
}

function getPaymentMethodData(
  paymentMethod: RampsOrder['paymentMethod'],
): { id: string; name: string } | undefined {
  if (!paymentMethod) return undefined;
  if (typeof paymentMethod === 'string')
    return { id: paymentMethod, name: paymentMethod };
  return { id: paymentMethod.id, name: paymentMethod.name ?? paymentMethod.id };
}

/**
 * Extracts the network chainId from a RampsOrder network field.
 * The V2 API may return network as a string or an object with chainId.
 */
function getNetworkChainId(network: RampsOrder['network']): string {
  if (!network) return '';
  if (typeof network === 'string') return network;
  return network.chainId || '';
}

/**
 * Extracts the provider code and order code from a FiatOrder.
 *
 * V2 orders have IDs in the format "/providers/{providerCode}/orders/{orderCode}".
 * Aggregator orders store the provider in order.data.provider (as an object or string).
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
    const provider = data.provider as string | RampsOrderProvider;
    if (typeof provider === 'string') {
      providerCode = provider;
    } else if (provider.id) {
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
  const fiatCurrencyCode =
    getFiatCurrencyCode(rampsOrder.fiatCurrency) || originalOrder.currency;
  const fiatDecimals = getFiatCurrencyDecimals(rampsOrder.fiatCurrency);
  const denomSymbol = getFiatCurrencyDenomSymbol(rampsOrder.fiatCurrency);

  const cryptoSymbol =
    getCryptoSymbol(rampsOrder.cryptoCurrency) || originalOrder.cryptocurrency;
  const cryptoDecimals = getCryptoDecimals(rampsOrder.cryptoCurrency);

  // Prefer the freshest provider data from the API; fall back to the stored one.
  const providerData =
    getProviderData(rampsOrder.provider) ??
    (originalOrder.data as Record<string, unknown>)?.provider;

  const paymentMethodData = getPaymentMethodData(rampsOrder.paymentMethod);

  return {
    id: originalOrder.id,
    provider: originalOrder.provider,
    createdAt: rampsOrder.createdAt,
    amount: rampsOrder.fiatAmount,
    fee: rampsOrder.totalFeesFiat,
    cryptoAmount: rampsOrder.cryptoAmount || 0,
    cryptoFee: rampsOrder.totalFeesFiat || 0,
    currency: fiatCurrencyCode,
    currencySymbol: denomSymbol || originalOrder.currencySymbol || '',
    cryptocurrency: cryptoSymbol,
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
      // Merge fields that the V2 API may update between polls.
      provider: providerData,
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
      fiatCurrency: {
        id: fiatCurrencyCode,
        symbol: fiatCurrencyCode,
        denomSymbol,
        decimals: fiatDecimals,
      },
      cryptoCurrency: {
        id: cryptoSymbol,
        symbol: cryptoSymbol,
        decimals: cryptoDecimals,
      },
      providerOrderId: rampsOrder.providerOrderId,
      paymentMethod: paymentMethodData,
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

    // Handle unknown status: increment error count and wait for retry
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
