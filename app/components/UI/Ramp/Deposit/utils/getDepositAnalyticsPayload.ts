import {
  FiatOrder,
  fiatOrdersRegionSelectorDeposit,
} from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { hasDepositOrderField } from './index';
import { AnalyticsEvents } from '../types';

function getDepositAnalyticsPayload(
  fiatOrder: FiatOrder,
  state: RootState,
): [
  'RAMPS_TRANSACTION_COMPLETED' | 'RAMPS_TRANSACTION_FAILED' | null,
  (
    | AnalyticsEvents['RAMPS_TRANSACTION_COMPLETED']
    | AnalyticsEvents['RAMPS_TRANSACTION_FAILED']
    | null
  ),
] {
  if (
    fiatOrder.state !== FIAT_ORDER_STATES.COMPLETED &&
    fiatOrder.state !== FIAT_ORDER_STATES.FAILED
  ) {
    return [null, null];
  }

  if (!hasDepositOrderField(fiatOrder.data, 'cryptoCurrency')) {
    return [null, null];
  }

  const order = fiatOrder.data;

  // Validate that we have proper crypto currency and network data
  // If the data doesn't look valid, don't track analytics
  if (!order.cryptoCurrency || !order.network) {
    return [null, null];
  }

  // Check if the crypto currency and network look like valid identifiers
  // Valid crypto currencies should be symbols like 'USDC', 'ETH', etc.
  // Valid networks should be identifiers like 'ethereum', 'eip155:1', etc.
  const isValidCryptoCurrency = /^[A-Z]{2,10}$/.test(
    order.cryptoCurrency.symbol,
  );
  const isValidNetwork = /^[a-z0-9:]+$/.test(order.network);

  if (!isValidCryptoCurrency || !isValidNetwork) {
    return [null, null];
  }

  const selectedRegion = fiatOrdersRegionSelectorDeposit(state);

  const baseAnalyticsData = {
    ramp_type: 'DEPOSIT' as const,
    amount_source: Number(order.fiatAmount),
    amount_destination: Number(fiatOrder.cryptoAmount),
    exchange_rate: Number(order.exchangeRate),
    payment_method_id: order.paymentMethod.id,
    country: selectedRegion?.isoCode || '',
    chain_id: order.network,
    currency_destination: order.cryptoCurrency.assetId,
    currency_source: order.fiatCurrency,
  };

  if (fiatOrder.state === FIAT_ORDER_STATES.COMPLETED) {
    return [
      'RAMPS_TRANSACTION_COMPLETED',
      {
        ...baseAnalyticsData,
        gas_fee: order.networkFees ? Number(order.networkFees) : 0,
        processing_fee: order.partnerFees ? Number(order.partnerFees) : 0,
        total_fee: Number(order.totalFeesFiat),
      },
    ];
  } else if (fiatOrder.state === FIAT_ORDER_STATES.FAILED) {
    return [
      'RAMPS_TRANSACTION_FAILED',
      {
        ...baseAnalyticsData,
        gas_fee: order.networkFees ? Number(order.networkFees) : 0,
        processing_fee: order.partnerFees ? Number(order.partnerFees) : 0,
        total_fee: Number(order.totalFeesFiat),
        error_message: order.statusDescription || 'transaction_failed',
      },
    ];
  }

  return [null, null];
}

export default getDepositAnalyticsPayload;
