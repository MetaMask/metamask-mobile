import type { RampsOrder } from '@metamask/ramps-controller';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import { AnalyticsEvents } from '../Aggregator/types';
import type { AnalyticsEvents as UnifiedAnalyticsEvents } from '../Deposit/types/analytics';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';

type EventName =
  | 'RAMPS_TRANSACTION_COMPLETED'
  | 'RAMPS_TRANSACTION_FAILED'
  | 'ONRAMP_PURCHASE_CANCELLED'
  | 'OFFRAMP_PURCHASE_FAILED'
  | 'OFFRAMP_PURCHASE_CANCELLED'
  | 'OFFRAMP_PURCHASE_COMPLETED'
  | null;

type EventParams =
  | AnalyticsEvents[NonNullable<EventName> & keyof AnalyticsEvents]
  | UnifiedAnalyticsEvents['RAMPS_TRANSACTION_COMPLETED']
  | UnifiedAnalyticsEvents['RAMPS_TRANSACTION_FAILED']
  | null;

/**
 * Builds analytics payload for RAMPS_V2 orders, reading from the
 * RampsOrder stored in fiatOrder.data instead of the legacy aggregator
 * Order shape.
 *
 * V2 buy completion/failure emit the unified `RAMPS_TRANSACTION_*` event
 * names and therefore use the deposit-flow payload schema (ramp_type,
 * amount_source, amount_destination, country, chain_id, gas_fee,
 * processing_fee, ...) so a single Mixpanel event name maps to a single
 * schema. Sell side and buy cancellation keep the legacy aggregator
 * shape because their event names (OFFRAMP_PURCHASE_*, ONRAMP_PURCHASE_CANCELLED)
 * are still typed against that shape and are scheduled for deprecation.
 */
const getRampsV2AnalyticsPayload = (
  fiatOrder: FiatOrder,
): [EventName, EventParams] => {
  const data = fiatOrder.data as RampsOrder | undefined;
  const isBuy =
    fiatOrder.orderType === 'BUY' || fiatOrder.orderType === 'DEPOSIT';

  let failedOrCancelledParams:
    | AnalyticsEvents['ONRAMP_PURCHASE_FAILED']
    | AnalyticsEvents['OFFRAMP_PURCHASE_FAILED']
    | AnalyticsEvents['ONRAMP_PURCHASE_CANCELLED']
    | AnalyticsEvents['OFFRAMP_PURCHASE_CANCELLED'];

  if (isBuy) {
    failedOrCancelledParams = {
      amount: fiatOrder.amount as number,
      currency_source: fiatOrder.currency,
      currency_destination: fiatOrder.cryptocurrency,
      order_type: fiatOrder.orderType,
      payment_method_id: data?.paymentMethod?.id ?? '',
      chain_id_destination: fiatOrder.network,
      provider_onramp: data?.provider?.name ?? '',
    };
  } else {
    failedOrCancelledParams = {
      amount: fiatOrder.amount as number,
      currency_source: fiatOrder.cryptocurrency,
      currency_destination: fiatOrder.currency,
      order_type: fiatOrder.orderType,
      payment_method_id: data?.paymentMethod?.id ?? '',
      chain_id_source: fiatOrder.network,
      provider_offramp: data?.provider?.name ?? '',
    };
  }

  const cryptoAmount = Number(fiatOrder.cryptoAmount);
  const computedExchangeRate =
    cryptoAmount > 0
      ? (Number(fiatOrder.amount) - Number(fiatOrder.fee)) / cryptoAmount
      : 0;

  const sharedCompletedPayload: Partial<
    AnalyticsEvents['OFFRAMP_PURCHASE_COMPLETED']
  > = {
    total_fee: Number(fiatOrder.fee),
    exchange_rate: computedExchangeRate,
    amount_in_usd: data?.fiatAmountInUsd,
  };

  const sellCompletePayload: AnalyticsEvents['OFFRAMP_PURCHASE_COMPLETED'] = {
    ...failedOrCancelledParams,
    ...sharedCompletedPayload,
    fiat_out: fiatOrder.amount,
  } as AnalyticsEvents['OFFRAMP_PURCHASE_COMPLETED'];

  const unifiedBuyBase = {
    ramp_type: 'UNIFIED_BUY_2' as const,
    amount_source: Number(fiatOrder.amount),
    amount_destination: cryptoAmount,
    exchange_rate: data?.exchangeRate ?? computedExchangeRate,
    payment_method_id: data?.paymentMethod?.id ?? '',
    country: data?.region ?? '',
    chain_id: data?.network?.chainId ?? fiatOrder.network ?? '',
    currency_destination: data?.cryptoCurrency?.assetId ?? '',
    currency_destination_symbol: data?.cryptoCurrency?.symbol,
    currency_destination_network: data?.network?.name,
    currency_source: data?.fiatCurrency?.symbol ?? fiatOrder.currency ?? '',
    provider_onramp: data?.provider?.name ?? '',
  };

  const unifiedBuyFees = {
    gas_fee: Number(data?.networkFees ?? 0),
    processing_fee: Number(data?.partnerFees ?? 0),
    total_fee: Number(fiatOrder.fee),
  };

  const unifiedBuyCompletePayload: UnifiedAnalyticsEvents['RAMPS_TRANSACTION_COMPLETED'] =
    {
      ...unifiedBuyBase,
      ...unifiedBuyFees,
    };

  const unifiedBuyFailedPayload: UnifiedAnalyticsEvents['RAMPS_TRANSACTION_FAILED'] =
    {
      ...unifiedBuyBase,
      ...unifiedBuyFees,
      error_message: data?.statusDescription ?? 'transaction_failed',
    };

  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      return isBuy
        ? ['RAMPS_TRANSACTION_FAILED', unifiedBuyFailedPayload]
        : ['OFFRAMP_PURCHASE_FAILED', failedOrCancelledParams];
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      return [
        isBuy ? 'ONRAMP_PURCHASE_CANCELLED' : 'OFFRAMP_PURCHASE_CANCELLED',
        failedOrCancelledParams,
      ];
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      return isBuy
        ? ['RAMPS_TRANSACTION_COMPLETED', unifiedBuyCompletePayload]
        : ['OFFRAMP_PURCHASE_COMPLETED', sellCompletePayload];
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      return [null, null];
    }
  }
};

export default getRampsV2AnalyticsPayload;
