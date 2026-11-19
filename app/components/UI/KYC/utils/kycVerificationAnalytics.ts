import {
  type KycAnalyticsStatus,
  type KycAnalyticsVerificationOutcome,
} from '@metamask/kyc-controller';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  buildKycBaseProperties,
  type KycStateInput,
} from './kycBaseProperties';
import { trackKycEvent } from './trackKycEvent';

export {
  buildKycBaseProperties,
  KYC_ANALYTICS_ENTRY_POINT,
  KYC_ANALYTICS_PROVIDER,
  KYC_ANALYTICS_SCREEN_NAME,
  KYC_ANALYTICS_VENDOR,
} from './kycBaseProperties';
export type { KycStateInput } from './kycBaseProperties';

/** Statuses of `KYC Verification Updated`; mobile fires `started` and `retry_started`. */
export type KycVerificationUpdatedStatus =
  | KycAnalyticsVerificationOutcome
  | 'started'
  | 'retry_started';

export type KycRetrySource = 'sumsub_error' | 'kyc_rejected';

export interface KycVerificationUpdatedInput extends KycStateInput {
  status: KycVerificationUpdatedStatus;
  /** Where the retry was pressed. Only set when `status` is `retry_started`. */
  retrySource?: KycRetrySource;
}

export interface KycStatusUpdatedInput extends KycStateInput {
  /**
   * The KYC status stored before the change. `none` when nothing was stored
   * before, so a consumer never reads an absent field as a first observation.
   */
  previousKycStatus: KycAnalyticsStatus;
}

/**
 * Fires `KYC Verification Updated`, the SumSub webview step. Analytics
 * failures never reach the caller.
 *
 * @param input - The status and any values already known by the caller.
 */
export function trackKycVerificationUpdated(
  input: KycVerificationUpdatedInput,
): void {
  trackKycEvent(MetaMetricsEvents.KYC_VERIFICATION_UPDATED, () => ({
    ...buildKycBaseProperties(input),
    status: input.status,
    ...(input.retrySource ? { retry_source: input.retrySource } : {}),
  }));
}

/**
 * Fires `KYC Status Updated`, a change of the stored KYC status. `kyc_status`
 * is the new status. Analytics failures never reach the caller.
 *
 * @param input - The new status, the previous one, and the flow status.
 */
export function trackKycStatusUpdated(input: KycStatusUpdatedInput): void {
  trackKycEvent(MetaMetricsEvents.KYC_STATUS_UPDATED, () => ({
    ...buildKycBaseProperties(input),
    previous_kyc_status: input.previousKycStatus,
  }));
}
