import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import Logger from '../../../../util/Logger';

/**
 * Properties for seedless onboarding legacy `data`-format vault decrypt tracking.
 */
export interface SeedlessLegacyDataVaultDecryptProperties {
  lib?: string;
  source: 'seedlessEncryptor';
  [key: string]: unknown;
}

/**
 * Tracks when SeedlessOnboardingController decrypts a vault using the legacy `data`
 * field instead of the mobile-canonical `cipher` field (ADR TO-590).
 *
 * Used as a runtime fallback for vaults not yet rewritten by migration 144.
 * Fire-and-forget: never throws.
 *
 * @param properties - Context for the tracking event.
 */
export const trackSeedlessLegacyDataVaultDecrypt = (
  properties: SeedlessLegacyDataVaultDecryptProperties,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SEEDLESS_ONBOARDING_LEGACY_DATA_VAULT_DECRYPTED,
      )
        .addProperties(properties)
        .build(),
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'Error tracking seedless legacy data vault decrypt event',
    );
  }
};
