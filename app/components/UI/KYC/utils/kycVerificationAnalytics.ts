import {
  type KycAnalyticsStatus,
  type KycAnalyticsVerificationOutcome,
} from '@metamask/kyc-controller';
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import {
  buildKycBaseProperties,
  type KycStateInput,
} from './kycBaseProperties';

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
 * Builds and sends one event. `buildProperties` runs inside the try, because
 * reading controller or store state is as likely to throw as the send itself
 * and these trackers sit on the identity-verification path — a launch, a
 * retry press, a screen mount. Nothing here may reach the caller.
 *
 * @param event - The event definition.
 * @param buildProperties - Produces the event properties.
 */
const track = (
  event: IMetaMetricsEvent,
  buildProperties: () => Record<string, string>,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(buildProperties())
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'vba-kyc', event: event.category },
    });
  }
};

/**
 * Fires `KYC Verification Updated`, the SumSub webview step. Analytics
 * failures never reach the caller.
 *
 * @param input - The status and any values already known by the caller.
 */
export function trackKycVerificationUpdated(
  input: KycVerificationUpdatedInput,
): void {
  track(MetaMetricsEvents.KYC_VERIFICATION_UPDATED, () => ({
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
  track(MetaMetricsEvents.KYC_STATUS_UPDATED, () => ({
    ...buildKycBaseProperties(input),
    previous_kyc_status: input.previousKycStatus,
  }));
}
