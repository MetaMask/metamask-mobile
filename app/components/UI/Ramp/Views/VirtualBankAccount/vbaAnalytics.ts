import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../../util/analytics/analytics';
import { readAnalyticsRegion } from '../../../../../util/analytics/analyticsRegion';
import Logger from '../../../../../util/Logger';
import type { IMetaMetricsEvent } from '../../../../../core/Analytics';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from './vbaOnboardingSnapshot';

/** Entry point shared by every VBA onboarding event (`metamask-money-vba-base`). */
export const VBA_ANALYTICS_ENTRY_POINT = 'add_funds_bank_account';
/** Vendor reported on VBA events. The KYC controller itself still uses `iron`. */
export const VBA_ANALYTICS_VENDOR = 'moonpay';

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
 * `region` is always sent: the schema marks it required and has no way to
 * express a missing country, so an unresolved location is `unknown`.
 *
 * @param overrides - Values the caller knows better than the last snapshot.
 * @returns The base properties.
 */
export const buildVbaBaseProperties = (
  overrides: VbaAnalyticsOverrides = {},
): Record<string, string> => ({
  entry_point: VBA_ANALYTICS_ENTRY_POINT,
  vendor: VBA_ANALYTICS_VENDOR,
  kyc_status: overrides.kycStatus ?? latestSnapshot.kycStatus,
  autoramp_status: latestSnapshot.autorampStatus,
  provider_flow_status: latestSnapshot.providerFlowStatus,
  region: readAnalyticsRegion(),
  ...(overrides.screenName ? { screen_name: overrides.screenName } : {}),
  ...(overrides.currencySource
    ? { currency_source: overrides.currencySource }
    : {}),
  ...(overrides.failureReason
    ? { failure_reason: overrides.failureReason }
    : {}),
});

/**
 * Builds and sends one VBA event. `buildProperties` runs inside the try,
 * because reading controller or store state is as likely to throw as the send
 * itself and these calls sit on the onboarding path — a screen mount, an
 * autoramp create. Nothing here may reach the caller.
 *
 * @param event - The event definition.
 * @param buildProperties - Produces the event properties.
 */
export const trackVbaEvent = (
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
      tags: { feature: 'vba-onboarding', event: event.category },
    });
  }
};
