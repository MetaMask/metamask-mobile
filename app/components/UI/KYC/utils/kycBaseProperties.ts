import {
  getKycAnalyticsStatus,
  type KycAnalyticsStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import { readAnalyticsRegion } from '../../../../util/analytics/analyticsRegion';

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

export interface KycStateInput {
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

/**
 * Builds the `metamask-kyc-base` properties.
 *
 * This is the only resolution of `kyc_status` for that library. It is the KYC
 * controller's own analytics status, never the Ramps VBA onboarding snapshot,
 * which resolves the status differently; every `metamask-kyc` event has to
 * report the same value for the same moment or the funnel cannot be joined on
 * it.
 *
 * Nothing from the session is sent beyond the derived statuses: no session id,
 * email, disclaimer ids or tokens.
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
