import type { SolanaPayLifecyclePayload } from '@metamask/transaction-pay-controller';

import { MetaMetricsEvents } from '../../../Analytics';
import type { AnalyticsUnfilteredProperties } from '../../../../util/analytics/analytics.types';
import { buildAndTrackEvent } from '../../utils/analytics';
import type { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger/transaction-pay-controller-messenger';

export function getSolanaPayLifecycleProperties(
  payload: SolanaPayLifecyclePayload,
): AnalyticsUnfilteredProperties {
  return {
    ...(payload.errorCode && { mm_pay_error_code: payload.errorCode }),
    mm_pay_follow_up_status: payload.followUpStatus,
    mm_pay_follow_up_transaction_id_present:
      payload.followUpTransactionIdPresent,
    mm_pay_is_recovery: payload.isRecovery,
    mm_pay_notification_status: payload.notificationStatus,
    mm_pay_outcome: payload.outcome,
    mm_pay_phase: payload.phase,
    mm_pay_provider: payload.provider,
    mm_pay_relay_status: payload.relayStatus,
    mm_pay_request_id_present: payload.requestIdPresent,
    mm_pay_source_asset_class: payload.sourceAssetClass,
    mm_pay_source_status: payload.sourceStatus,
    mm_pay_source_transaction_id_present: payload.sourceTransactionIdPresent,
    mm_pay_target_transaction_id_present: payload.targetTransactionIdPresent,
  };
}

/**
 * Tracks Solana-only external lifecycle states through Mobile's standard
 * analytics pipeline. That pipeline supplies the same analytics identity used
 * by EVM MetaMask Pay; this event adds only categorical source, Relay, and
 * recovery diagnostics that ordinary transaction events cannot represent.
 *
 * @param initMessenger - Messenger delegated to AnalyticsController.
 * @param payload - Core's privacy-safe Solana lifecycle projection.
 */
export function trackSolanaPayLifecycle(
  initMessenger: TransactionPayControllerInitMessenger,
  payload: SolanaPayLifecyclePayload,
): void {
  buildAndTrackEvent(
    initMessenger,
    MetaMetricsEvents.METAMASK_PAY_SOLANA_LIFECYCLE,
    getSolanaPayLifecycleProperties(payload),
  );
}
