import {
  getKycAnalyticsStatus,
  type KycAnalyticsStatus,
  type KycAnalyticsVerificationOutcome,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../../core/Analytics';
import { readAnalyticsRegion } from '../../../../util/analytics/analyticsRegion';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';

/** Screen name for the VBA onboarding funnel (`metamask-kyc-base`). */
export const KYC_ANALYTICS_SCREEN_NAME = 'vba_onboarding';
/** Entry point for the VBA onboarding funnel (`metamask-kyc-base`). */
export const KYC_ANALYTICS_ENTRY_POINT = 'add_funds_bank_account';
/** Identity verification provider (`metamask-kyc-base`). */
export const KYC_ANALYTICS_PROVIDER = 'sumsub';
/**
 * Vendor reported on KYC events. The schema allows `moonpay`; the KYC
 * controller itself still reports its own vendor (`iron`).
 */
export const KYC_ANALYTICS_VENDOR = 'moonpay';

/** Statuses of `KYC Verification Updated`; mobile fires `started` and `retry_started`. */
export type KycVerificationUpdatedStatus =
  | KycAnalyticsVerificationOutcome
  | 'started'
  | 'retry_started';

export type KycRetrySource = 'sumsub_error' | 'kyc_rejected';

interface KycStateInput {
  /** Analytics KYC status now. Read from controller state when omitted. */
  kycStatus?: KycAnalyticsStatus;
  /** Provider flow outcome now. Read from controller state when omitted. */
  providerFlowStatus?: string;
  /**
   * Screen the event was fired from. Defaults to the VBA onboarding funnel; a
   * reused KYC call passes its own screen name.
   */
  screenName?: string;
}

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
 * Builds the `metamask-kyc-base` properties. This is the only resolution of
 * `kyc_status` for that library: the KYC controller's own analytics status,
 * never the Ramps VBA onboarding snapshot, so every `metamask-kyc` event
 * reports the same value for the same moment.
 *
 * Nothing from the session is sent beyond the derived statuses: no session
 * id, email, disclaimer ids or tokens.
 *
 * @param input - Statuses already known by the caller.
 * @returns The base properties.
 */
export function buildKycBaseProperties(
  input: KycStateInput = {},
): Record<string, string> {
  const state = Engine.context.KycController?.state;
  const providerFlowStatus =
    input.providerFlowStatus ?? state?.providerFlowStatus;
  const kycStatus =
    input.kycStatus ??
    (state ? getKycAnalyticsStatus(state.sessionStatus) : undefined);

  return {
    screen_name: input.screenName ?? KYC_ANALYTICS_SCREEN_NAME,
    entry_point: KYC_ANALYTICS_ENTRY_POINT,
    vendor: KYC_ANALYTICS_VENDOR,
    kyc_provider: KYC_ANALYTICS_PROVIDER,
    kyc_status: kycStatus ?? 'none',
    provider_flow_status: providerFlowStatus ?? 'not_started',
    region: readAnalyticsRegion(),
  };
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
