import type { RampsOrder } from '@metamask/ramps-controller';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import { AnalyticsEvents } from '../Aggregator/types';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';

type EventName =
  | 'ONRAMP_PURCHASE_FAILED'
  | 'ONRAMP_PURCHASE_CANCELLED'
  | 'ONRAMP_PURCHASE_COMPLETED'
  | 'OFFRAMP_PURCHASE_FAILED'
  | 'OFFRAMP_PURCHASE_CANCELLED'
  | 'OFFRAMP_PURCHASE_COMPLETED'
  | null;

type EventParams =
  | AnalyticsEvents[NonNullable<EventName> & keyof AnalyticsEvents]
  | null;

/**
 * Builds analytics payload for RAMPS_V2 orders, reading from the
 * RampsOrder stored in fiatOrder.data instead of the legacy aggregator
 * Order shape.
 */
const getRampsV2AnalyticsPayload = (
  fiatOrder: FiatOrder,
): [EventName, EventParams] => {
  const data = fiatOrder.data as RampsOrder | undefined;
  const isBuy = fiatOrder.orderType === 'BUY';

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

  const sharedCompletedPayload: Partial<
    | AnalyticsEvents['OFFRAMP_PURCHASE_COMPLETED']
    | AnalyticsEvents['ONRAMP_PURCHASE_COMPLETED']
  > = {
    total_fee: Number(fiatOrder.fee),
    exchange_rate:
      (Number(fiatOrder.amount) - Number(fiatOrder.fee)) /
      Number(fiatOrder.cryptoAmount),
    amount_in_usd: data?.fiatAmountInUsd,
  };

  const sellCompletePayload: AnalyticsEvents['OFFRAMP_PURCHASE_COMPLETED'] = {
    ...failedOrCancelledParams,
    ...sharedCompletedPayload,
    fiat_out: fiatOrder.amount,
  } as AnalyticsEvents['OFFRAMP_PURCHASE_COMPLETED'];

  const buyCompletePayload: AnalyticsEvents['ONRAMP_PURCHASE_COMPLETED'] = {
    ...failedOrCancelledParams,
    ...sharedCompletedPayload,
    crypto_out: fiatOrder.cryptoAmount,
  } as AnalyticsEvents['ONRAMP_PURCHASE_COMPLETED'];

  switch (fiatOrder.state) {
    case FIAT_ORDER_STATES.FAILED: {
      return [
        isBuy ? 'ONRAMP_PURCHASE_FAILED' : 'OFFRAMP_PURCHASE_FAILED',
        failedOrCancelledParams,
      ];
    }
    case FIAT_ORDER_STATES.CANCELLED: {
      return [
        isBuy ? 'ONRAMP_PURCHASE_CANCELLED' : 'OFFRAMP_PURCHASE_CANCELLED',
        failedOrCancelledParams,
      ];
    }
    case FIAT_ORDER_STATES.COMPLETED: {
      return isBuy
        ? ['ONRAMP_PURCHASE_COMPLETED', buyCompletePayload]
        : ['OFFRAMP_PURCHASE_COMPLETED', sellCompletePayload];
    }
    case FIAT_ORDER_STATES.PENDING:
    default: {
      return [null, null];
    }
  }
};

export default getRampsV2AnalyticsPayload;
