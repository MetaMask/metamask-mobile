import {
  deriveKycStatus,
  type KycDerivedStatus,
  type KycVerificationEventStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';

/** Screen name for the VBA onboarding funnel (`metamask-kyc-base`). */
export const KYC_ANALYTICS_SCREEN_NAME = 'vba_onboarding';
/** Entry point for the VBA onboarding funnel (`metamask-kyc-base`). */
export const KYC_ANALYTICS_ENTRY_POINT = 'add_funds_bank_account';
/** Identity verification provider (`metamask-kyc-base`). */
export const KYC_ANALYTICS_PROVIDER = 'sumsub';

/** Statuses of `KYC Verification Updated`; mobile fires `started` and `retry_started`. */
export type KycVerificationUpdatedStatus =
  | KycVerificationEventStatus
  | 'started'
  | 'retry_started';

export type KycRetrySource = 'sumsub_error' | 'kyc_rejected';

export interface KycVerificationUpdatedInput {
  status: KycVerificationUpdatedStatus;
  /** Derived KYC status before the change. Only set for controller-emitted statuses. */
  previousKycStatus?: KycDerivedStatus;
  /** Where the retry was pressed. Only set when `status` is `retry_started`. */
  retrySource?: KycRetrySource;
  /** Derived KYC status now. Read from controller state when omitted. */
  kycStatus?: KycDerivedStatus;
  /** Provider flow outcome now. Read from controller state when omitted. */
  providerFlowStatus?: string;
  /** Vendor now. Read from controller state when omitted. */
  vendor?: string | null;
}

/**
 * Builds the `KYC Verification Updated` properties (`metamask-kyc-base` plus
 * the event's own `status`, `previous_kyc_status` and `retry_source`).
 *
 * Nothing from the session is sent beyond the derived statuses: no session id,
 * email, disclaimer ids or tokens.
 *
 * @param input - The status and any values already known by the caller.
 * @returns The event properties.
 */
export function buildKycVerificationUpdatedProperties(
  input: KycVerificationUpdatedInput,
): Record<string, string> {
  const state = Engine.context.KycController?.state;
  const providerFlowStatus =
    input.providerFlowStatus ?? state?.providerFlowStatus;
  const kycStatus =
    input.kycStatus ??
    (state && providerFlowStatus
      ? deriveKycStatus(state.sessionStatus, state.providerFlowStatus)
      : undefined);
  const vendor = input.vendor === undefined ? state?.vendor : input.vendor;

  return {
    screen_name: KYC_ANALYTICS_SCREEN_NAME,
    entry_point: KYC_ANALYTICS_ENTRY_POINT,
    kyc_provider: KYC_ANALYTICS_PROVIDER,
    status: input.status,
    ...(vendor ? { vendor } : {}),
    ...(kycStatus ? { kyc_status: kycStatus } : {}),
    ...(providerFlowStatus ? { provider_flow_status: providerFlowStatus } : {}),
    ...(input.previousKycStatus
      ? { previous_kyc_status: input.previousKycStatus }
      : {}),
    ...(input.retrySource ? { retry_source: input.retrySource } : {}),
  };
}

/**
 * Fires `KYC Verification Updated`. Analytics failures never reach the caller.
 *
 * @param input - The status and any values already known by the caller.
 */
export function trackKycVerificationUpdated(
  input: KycVerificationUpdatedInput,
): void {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.KYC_VERIFICATION_UPDATED,
      )
        .addProperties(buildKycVerificationUpdatedProperties(input))
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'vba-kyc', event: 'KYC Verification Updated' },
    });
  }
}
