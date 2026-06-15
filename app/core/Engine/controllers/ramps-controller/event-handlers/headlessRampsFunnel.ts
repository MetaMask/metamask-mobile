import {
  type RampsOrder,
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
import type { AnalyticsEvents } from '../../../../../components/UI/Ramp/Deposit/types/analytics';

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

/**
 * Headless ramps funnel subscriber for `RampsController:orderStatusChanged`
 * (TRAM-3623 AC5). Registered alongside the existing notification and metrics
 * subscribers in `ramps-controller-init.ts` (same V2-gated site). Kept separate
 * from `handleOrderStatusChangedForMetrics` on purpose: extending that handler
 * would break its test's `MetaMetricsEvents` mock (only the 6 ONRAMP/OFFRAMP
 * keys), and the two emit distinct, intentionally non-overlapping vocabularies.
 *
 * On a terminal failure (`Failed`/`IdExpired`) of a headless order (one with a
 * context entry written at confirm time), emit `RAMPS_TRANSACTION_FAILED` then
 * delete the entry. Emit-then-delete keyed identically is idempotent: a second
 * identical event finds no entry and no-ops. On `Completed`/`Cancelled`, just
 * delete the entry. No-op when there is no entry (non-headless UB2-native, UB1,
 * or - under Option B - any order after an app relaunch).
 */
export function handleOrderStatusChangedForHeadlessRampsFunnel({
  order,
}: {
  order: RampsOrder;
  previousStatus?: unknown;
}): void {
  const orderCode = extractOrderCode(order.providerOrderId);

  switch (order.status) {
    case Status.Failed:
    case Status.IdExpired: {
      const context = getHeadlessOrderContext(orderCode);
      if (!context) {
        // Not a headless order this session (or post-restart under Option B).
        return;
      }
      // `params` is explicitly typed to the schema interface so the payload
      // stays in lockstep; the spread below hands `addProperties` a fresh
      // object literal (assignable to the broad AnalyticsUnfilteredProperties)
      // without weakening that annotation.
      const params: AnalyticsEvents['RAMPS_TRANSACTION_FAILED'] =
        buildHeadlessTransactionFailedParams(order, context);
      try {
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
      return;
    }

    case Status.Completed:
    case Status.Cancelled:
      // Terminal but not a failure: drop the carried context (no emit here -
      // confirmed/completed events are emitted elsewhere on the headless path).
      deleteHeadlessOrderContext(orderCode);
      return;

    default:
      // Non-terminal status: keep the context until the order resolves.
      return;
  }
}
