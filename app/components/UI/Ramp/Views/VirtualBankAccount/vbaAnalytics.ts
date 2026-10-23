import ReduxService from '../../../../../core/redux';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import type { IMetaMetricsEvent } from '../../../../../core/Analytics';
import type { RootState } from '../../../../../reducers';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

/** Entry point shared by every VBA onboarding event (`metamask-money-vba-base`). */
export const VBA_ANALYTICS_ENTRY_POINT = 'add_funds_bank_account';
/** Vendor reported on VBA events. The KYC controller itself still uses `iron`. */
export const VBA_ANALYTICS_VENDOR = 'moonpay';
/** Screen name of the VBA funnel for `metamask-kyc-base` events. */
export const KYC_ANALYTICS_SCREEN_NAME = 'vba_onboarding';
/** Identity verification provider (`metamask-kyc-base`). */
export const KYC_ANALYTICS_PROVIDER = 'sumsub';

export type VbaKycAnalyticsStatus =
  | 'none'
  | 'new'
  | 'retry'
  | 'pending'
  | 'approved'
  | 'rejected';

let latestSnapshot: VbaOnboardingSnapshot = EMPTY_VBA_ONBOARDING_SNAPSHOT;

/**
 * Remembers the latest hydrated onboarding facts so screens can report
 * `kyc_status`, `autoramp_status` and `provider_flow_status` without hydrating
 * again.
 *
 * @param snapshot - Facts from the most recent hydrate.
 */
export const recordVbaOnboardingSnapshot = (
  snapshot: VbaOnboardingSnapshot,
): void => {
  latestSnapshot = snapshot;
};

/** Clears the remembered snapshot between tests. */
export const resetVbaOnboardingSnapshotForAnalytics = (): void => {
  latestSnapshot = EMPTY_VBA_ONBOARDING_SNAPSHOT;
};

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

export interface VbaAnalyticsOverrides {
  screenName?: string;
  kycStatus?: VbaKycAnalyticsStatus;
  currencySource?: string;
  failureReason?: string;
}

/**
 * Properties of `metamask-money-vba-base`. No wallet address, session id,
 * email or other personal data is included.
 *
 * @param overrides - Values the caller knows better than the last snapshot.
 * @returns The base properties.
 */
export const buildVbaBaseProperties = (
  overrides: VbaAnalyticsOverrides = {},
): Record<string, string> => {
  const region = readRegion();
  return {
    entry_point: VBA_ANALYTICS_ENTRY_POINT,
    vendor: VBA_ANALYTICS_VENDOR,
    kyc_status: overrides.kycStatus ?? latestSnapshot.kycStatus,
    autoramp_status: latestSnapshot.autorampStatus,
    provider_flow_status: latestSnapshot.providerFlowStatus,
    ...(region ? { region } : {}),
    ...(overrides.screenName ? { screen_name: overrides.screenName } : {}),
    ...(overrides.currencySource
      ? { currency_source: overrides.currencySource }
      : {}),
    ...(overrides.failureReason
      ? { failure_reason: overrides.failureReason }
      : {}),
  };
};

/**
 * Properties of `metamask-kyc-base`.
 *
 * @param overrides - Values the caller knows better than the last snapshot.
 * @returns The base properties.
 */
export const buildKycBaseProperties = (
  overrides: VbaAnalyticsOverrides = {},
): Record<string, string> => {
  const region = readRegion();
  return {
    screen_name: overrides.screenName ?? KYC_ANALYTICS_SCREEN_NAME,
    entry_point: VBA_ANALYTICS_ENTRY_POINT,
    vendor: VBA_ANALYTICS_VENDOR,
    kyc_provider: KYC_ANALYTICS_PROVIDER,
    kyc_status: overrides.kycStatus ?? latestSnapshot.kycStatus,
    provider_flow_status: latestSnapshot.providerFlowStatus,
    ...(region ? { region } : {}),
  };
};

/**
 * Tracks an event. Analytics failures are logged, never thrown.
 *
 * @param event - The event definition.
 * @param properties - Event properties.
 */
export const trackVbaEvent = (
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
      tags: { feature: 'vba-onboarding', event: event.category },
    });
  }
};
