import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import type { AnalyticsEvents, RampSurface } from '../types/depositAnalytics';

type RampsTransactionConfirmedRampType =
  AnalyticsEvents['RAMPS_TRANSACTION_CONFIRMED']['ramp_type'];

/**
 * Returns whether an order should emit `RAMPS_TRANSACTION_CONFIRMED`.
 * Terminal failures must not report as confirmed/placed (TRAM-3691).
 */
export function shouldEmitRampsTransactionConfirmed(
  status: RampsOrder['status'],
): boolean {
  return (
    status !== RampsOrderStatus.Failed && status !== RampsOrderStatus.IdExpired
  );
}

/**
 * Builds the `RAMPS_TRANSACTION_CONFIRMED` payload from a `RampsOrder`.
 * Shared across UB2 callback paths (OrderDetails, Checkout, Transak routing).
 */
export function buildRampsTransactionConfirmedPayload(
  order: RampsOrder,
  options: {
    rampType: RampsTransactionConfirmedRampType;
    region: string;
    rampSurface?: RampSurface;
  },
): AnalyticsEvents['RAMPS_TRANSACTION_CONFIRMED'] {
  const { rampType, region, rampSurface } = options;

  return {
    ramp_type: rampType,
    ramp_surface: rampSurface,
    amount_source: Number(order.fiatAmount),
    amount_destination: Number(order.cryptoAmount),
    exchange_rate: Number(order.exchangeRate),
    gas_fee: order.networkFees ? Number(order.networkFees) : 0,
    processing_fee: order.partnerFees ? Number(order.partnerFees) : 0,
    total_fee: Number(order.totalFeesFiat),
    payment_method_id: order.paymentMethod?.id || '',
    country: region,
    region,
    chain_id: order.network?.chainId || '',
    currency_destination: order.cryptoCurrency?.assetId || '',
    currency_destination_symbol: order.cryptoCurrency?.symbol || '',
    currency_destination_network: order.network?.name || '',
    currency_source: order.fiatCurrency?.symbol || '',
  };
}
