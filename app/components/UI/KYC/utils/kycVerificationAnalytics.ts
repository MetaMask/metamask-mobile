import {
  getKycAnalyticsStatus,
  type KycAnalyticsStatus,
  type KycAnalyticsVerificationOutcome,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux';
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../../core/Analytics';
import type { RootState } from '../../../../reducers';
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';
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
}

export interface KycVerificationUpdatedInput extends KycStateInput {
  status: KycVerificationUpdatedStatus;
  /** Where the retry was pressed. Only set when `status` is `retry_started`. */
  retrySource?: KycRetrySource;
}

export interface KycStatusUpdatedInput extends KycStateInput {
  /** The KYC status stored before the change. Absent the first time one is stored. */
  previousKycStatus?: KycAnalyticsStatus;
}

/**
 * Lowercase ISO 3166-1 alpha-2 country of the user, from the geolocation
 * controller (`BR-SP` becomes `br`). Absent while the location is unknown.
 *
 * @returns The region, or undefined.
 */
const readRegion = (): string | undefined => {
  try {
    const location = selectGeolocationLocation(
      ReduxService.store.getState() as RootState,
    );
    const country =
      typeof location === 'string' ? location.split('-')[0] : undefined;
    return country && country.length === 2 && country !== 'XX'
      ? country.toLowerCase()
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Builds the `metamask-kyc-base` properties. Nothing from the session is sent
 * beyond the derived statuses: no session id, email, disclaimer ids or tokens.
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
  const region = readRegion();

  return {
    screen_name: KYC_ANALYTICS_SCREEN_NAME,
    entry_point: KYC_ANALYTICS_ENTRY_POINT,
    vendor: KYC_ANALYTICS_VENDOR,
    kyc_provider: KYC_ANALYTICS_PROVIDER,
    ...(region ? { region } : {}),
    ...(kycStatus ? { kyc_status: kycStatus } : {}),
    ...(providerFlowStatus ? { provider_flow_status: providerFlowStatus } : {}),
  };
}

const track = (
  event: IMetaMetricsEvent,
  properties: Record<string, string>,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
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
  track(MetaMetricsEvents.KYC_VERIFICATION_UPDATED, {
    ...buildKycBaseProperties(input),
    status: input.status,
    ...(input.retrySource ? { retry_source: input.retrySource } : {}),
  });
}

/**
 * Fires `KYC Status Updated`, a change of the stored KYC status. `kyc_status`
 * is the new status. Analytics failures never reach the caller.
 *
 * @param input - The new status, the previous one when known, and the flow status.
 */
export function trackKycStatusUpdated(input: KycStatusUpdatedInput): void {
  track(MetaMetricsEvents.KYC_STATUS_UPDATED, {
    ...buildKycBaseProperties(input),
    ...(input.previousKycStatus
      ? { previous_kyc_status: input.previousKycStatus }
      : {}),
  });
}
