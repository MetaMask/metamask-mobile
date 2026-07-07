import {
  type RampsOrder,
  type RampsOrderStatus,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import { MetaMetricsEvents } from '../../../../Analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import { extractOrderCode } from '../../../../../components/UI/Ramp/utils/extractOrderCode';
import {
  deleteHeadlessOrderContext,
  getHeadlessOrderContext,
  type HeadlessOrderContext,
} from '../headlessOrderContextRegistry';
// Type-only import so `react` is not pulled into core; mirrors the emission in
// `useAnalytics` without importing the hook.
import type { AnalyticsEvents } from '../../../../../components/UI/Ramp/types/depositAnalytics';

/**
 * Builds the `RAMPS_TRANSACTION_FAILED` payload for a headless order. Mirrors
 * the headless `RAMPS_TRANSACTION_CONFIRMED` payload emitted by
 * `useTransakRouting` (NOT the buy-branch of `handleOrderStatusChangedForMetrics`,
 * which uses a different ONRAMP/OFFRAMP vocabulary). `params` is explicitly
 * typed so the payload stays in lockstep with the schema.
 */
function buildHeadlessTransactionFailedParams(
  order: RampsOrder,
  context: HeadlessOrderContext,
): AnalyticsEvents['RAMPS_TRANSACTION_FAILED'] {
  return {
    ramp_type: 'HEADLESS',
    ramp_surface: context.rampSurface,
    region: context.region,
    country: context.region,
    error_message: order.statusDescription || 'transaction_failed',
    provider_onramp: order.provider?.name || '',
    amount_source: Number(order.fiatAmount),
    amount_destination: Number(order.cryptoAmount),
    exchange_rate: Number(order.exchangeRate ?? 0),
    gas_fee: Number(order.networkFees ?? 0),
    processing_fee: Number(order.partnerFees ?? 0),
    total_fee: Number(order.totalFeesFiat),
    payment_method_id: order.paymentMethod?.id || '',
    chain_id: order.network?.chainId || '',
    currency_destination: order.cryptoCurrency?.assetId || '',
    currency_source: order.fiatCurrency?.symbol || '',
  };
}

function buildV2AnalyticsPayload(
  order: RampsOrder,
  _previousStatus: RampsOrderStatus,
) {
  const isBuy = order.orderType === 'BUY' || order.orderType === 'DEPOSIT';

  // Legacy aggregator-shaped params, used for OFFRAMP_PURCHASE_*
  // (sell completion/failure) and ONRAMP_PURCHASE_CANCELLED (buy cancellation).
  // These event names are scheduled for deprecation; their typed contract
  // is still the legacy on-ramp/off-ramp shape.
  const legacyParams = {
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

  // Unified ramps transaction payload for V2 buys. Matches the shape the
  // deposit flow already emits under RAMPS_TRANSACTION_* so a single Mixpanel
  // event name maps to a single schema regardless of provider.
  const cryptoAmount = Number(order.cryptoAmount);
  const feeTotal = Number(order.totalFeesFiat);
  const computedExchangeRate =
    cryptoAmount > 0 ? (Number(order.fiatAmount) - feeTotal) / cryptoAmount : 0;

  const unifiedBuyBase = {
    ramp_type: 'UNIFIED_BUY_2' as const,
    amount_source: order.fiatAmount,
    amount_destination: cryptoAmount,
    exchange_rate: order.exchangeRate ?? computedExchangeRate,
    payment_method_id: order.paymentMethod?.id ?? '',
    country: order.region ?? '',
    chain_id: order.network?.chainId ?? '',
    currency_destination: order.cryptoCurrency?.assetId ?? '',
    currency_destination_symbol: order.cryptoCurrency?.symbol,
    currency_destination_network: order.network?.name,
    currency_source: order.fiatCurrency?.symbol ?? '',
    provider_onramp: order.provider?.name ?? '',
  };

  const unifiedBuyFees = {
    gas_fee: Number(order.networkFees ?? 0),
    processing_fee: Number(order.partnerFees ?? 0),
    total_fee: feeTotal,
  };

  switch (order.status) {
    case Status.Completed: {
      if (isBuy) {
        return {
          event: MetaMetricsEvents.RAMPS_TRANSACTION_COMPLETED,
          params: { ...unifiedBuyBase, ...unifiedBuyFees },
        };
      }
      return {
        event: MetaMetricsEvents.OFFRAMP_PURCHASE_COMPLETED,
        params: {
          ...legacyParams,
          total_fee: feeTotal,
          exchange_rate: computedExchangeRate,
          amount_in_usd: order.fiatAmountInUsd,
          fiat_out: order.fiatAmount,
        },
      };
    }

    case Status.Failed:
    case Status.IdExpired: {
      if (isBuy) {
        return {
          event: MetaMetricsEvents.RAMPS_TRANSACTION_FAILED,
          params: {
            ...unifiedBuyBase,
            ...unifiedBuyFees,
            error_message: order.statusDescription ?? 'transaction_failed',
          },
        };
      }
      return {
        event: MetaMetricsEvents.OFFRAMP_PURCHASE_FAILED,
        params: legacyParams,
      };
    }

    case Status.Cancelled:
      return {
        event: isBuy
          ? MetaMetricsEvents.ONRAMP_PURCHASE_CANCELLED
          : MetaMetricsEvents.OFFRAMP_PURCHASE_CANCELLED,
        params: legacyParams,
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
  // TRAM-3623 AC5: a headless order carries a context entry (written at confirm
  // time by `useTransakRouting`). Handle its terminal failure here, as the
  // SINGLE `orderStatusChanged` metrics subscriber, so it cannot double-emit
  // `RAMPS_TRANSACTION_FAILED` with the generic buy/deposit emit below (which
  // TRAM-3534 #31207 also maps deposits to). Placed before the generic emit and
  // returning on the failure path is the de-dup.
  const orderCode = extractOrderCode(order.providerOrderId);
  const headlessContext = getHeadlessOrderContext(orderCode);
  if (headlessContext) {
    if (order.status === Status.Failed || order.status === Status.IdExpired) {
      try {
        const params = buildHeadlessTransactionFailedParams(
          order,
          headlessContext,
        );
        analytics.trackEvent(
          AnalyticsEventBuilder.createEventBuilder(
            MetaMetricsEvents.RAMPS_TRANSACTION_FAILED,
          )
            .addProperties({ ...params })
            .build(),
        );
      } catch (error) {
        Logger.error(error as Error, {
          message:
            'RampsController: Failed to track headless RAMPS_TRANSACTION_FAILED',
        });
      } finally {
        // Delete even if the emit threw, so a retried poll cannot double-emit.
        deleteHeadlessOrderContext(orderCode);
      }
      // Suppress the generic emit for this headless failure (the de-dup).
      return;
    }
    if (
      order.status === Status.Completed ||
      order.status === Status.Cancelled
    ) {
      // Bound the map on terminal success/cancel; do NOT emit a tagged
      // COMPLETED (no schema for it). Option B: fall through to the generic
      // emit so the existing controller completion signal is preserved.
      deleteHeadlessOrderContext(orderCode);
    }
    // Non-terminal headless: fall through (the generic emit no-ops for those).
  }

  const analyticsPayload = buildV2AnalyticsPayload(order, previousStatus);

  if (analyticsPayload) {
    try {
      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(analyticsPayload.event)
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
