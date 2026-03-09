import {
  type RampsOrder,
  type RampsOrderStatus,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import { MetaMetrics, MetaMetricsEvents } from '../../../../Analytics';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import Logger from '../../../../../util/Logger';

function buildV2AnalyticsPayload(
  order: RampsOrder,
  _previousStatus: RampsOrderStatus,
) {
  const isBuy = order.orderType === 'BUY';

  const baseParams = {
    amount: order.fiatAmount,
    currency_source: isBuy
      ? (order.fiatCurrency?.symbol ?? '')
      : (order.cryptoCurrency?.symbol ?? ''),
    currency_destination: isBuy
      ? (order.cryptoCurrency?.symbol ?? '')
      : (order.fiatCurrency?.symbol ?? ''),
    order_type: order.orderType,
    payment_method_id: order.paymentMethod?.id ?? '',
    ...(isBuy
      ? {
          chain_id_destination: order.network?.chainId ?? '',
          provider_onramp: order.provider?.name ?? '',
        }
      : {
          chain_id_source: order.network?.chainId ?? '',
          provider_offramp: order.provider?.name ?? '',
        }),
  };

  switch (order.status) {
    case Status.Completed: {
      const cryptoAmount = Number(order.cryptoAmount);
      const feeTotal = Number(order.totalFeesFiat);
      const exchangeRate =
        cryptoAmount > 0
          ? (Number(order.fiatAmount) - feeTotal) / cryptoAmount
          : 0;

      return {
        event: isBuy
          ? MetaMetricsEvents.ONRAMP_PURCHASE_COMPLETED
          : MetaMetricsEvents.OFFRAMP_PURCHASE_COMPLETED,
        params: {
          ...baseParams,
          total_fee: feeTotal,
          exchange_rate: exchangeRate,
          amount_in_usd: order.fiatAmountInUsd,
          ...(isBuy
            ? { crypto_out: order.cryptoAmount }
            : { fiat_out: order.fiatAmount }),
        },
      };
    }

    case Status.Failed:
    case Status.IdExpired:
      return {
        event: isBuy
          ? MetaMetricsEvents.ONRAMP_PURCHASE_FAILED
          : MetaMetricsEvents.OFFRAMP_PURCHASE_FAILED,
        params: baseParams,
      };

    case Status.Cancelled:
      return {
        event: isBuy
          ? MetaMetricsEvents.ONRAMP_PURCHASE_CANCELLED
          : MetaMetricsEvents.OFFRAMP_PURCHASE_CANCELLED,
        params: baseParams,
      };

    default:
      return null;
  }
}

export function handleOrderStatusChangedForMetrics({
  order,
  previousStatus,
}: {
  order: RampsOrder;
  previousStatus: RampsOrderStatus;
}): void {
  const analyticsPayload = buildV2AnalyticsPayload(order, previousStatus);

  if (analyticsPayload) {
    try {
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(analyticsPayload.event)
          .addProperties(analyticsPayload.params)
          .build(),
      );
    } catch (error) {
      Logger.error(error as Error, {
        message:
          'RampsController: Failed to track order status changed analytics',
      });
    }
  }
}
