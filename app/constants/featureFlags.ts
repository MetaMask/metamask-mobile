import type { Json } from '@metamask/utils';

/**
 * Feature flag names that can be overridden in development tools.
 * These correspond to remote feature flags that have selector implementations
 * in app/selectors/featureFlagController/
 */
export enum FeatureFlagNames {
  otaUpdatesEnabled = 'otaUpdatesEnabled',
  fullPageAccountList = 'fullPageAccountList',
  assetsDefiPositionsEnabled = 'assetsDefiPositionsEnabled',
  tokenDetailsV2Buttons = 'tokenDetailsV2Buttons',
  tokenDetailsV2ButtonLayout = 'tokenDetailsV2ButtonLayout',
  complianceEnabled = 'complianceEnabled',
  legacyIosGoogleConfigEnabled = 'legacyIosGoogleConfigEnabled',
  googleLoginIosUnsupportedBlockingEnabled = 'googleLoginIosUnsupportedBlockingEnabled',
  telegramLoginEnabled = 'telegram_login_enabled',
  tronClaimUnstakedTrxButtonEnabled = 'tronClaimUnstakedTrxButtonEnabled',
  addDeviceSyncEnabled = 'addDeviceSyncEnabled',
  hapticsKillSwitch = 'hapticsKillSwitch',
  ledgerDmk = 'ledgerDmk',
}

/** Minimum expected app version required for QR add-device account sync. Will update if extends */
export const ADD_DEVICE_SYNC_MINIMUM_VERSION = '8.6.0';

/** Minimum expected app version required for Ledger DMK (Device Management Key). */
export const LEDGER_DMK_MINIMUM_VERSION = '8.2.0';

/**
 * Default for the OFAC compliance feature flag. Centralized here so the
 * selector and any init code share a single source of truth.
 */
export const DEFAULT_COMPLIANCE_ENABLED = false;

/**
 * Default for the Telegram seedless-login feature flag.
 */
export const DEFAULT_TELEGRAM_LOGIN_ENABLED = false;

/**
 * LaunchDarkly / Redux key for the mobile minimum-versions feature flag. Its
 * value is not part of {@link FeatureFlagNames} because it is a structured
 * object rather than a simple toggle.
 */
export const MOBILE_MINIMUM_VERSIONS_FLAG_NAME = 'mobileMinimumVersions';

/**
 * Default minimum app versions used when the remote flag is missing or invalid.
 */
export const DEFAULT_MOBILE_MINIMUM_VERSIONS = {
  appMinimumBuild: 1243,
  appleMinimumOS: 6,
  androidMinimumAPIVersion: 21,
};

export const DEFAULT_FEATURE_FLAG_VALUES: Partial<
  Record<FeatureFlagNames, Json>
> = {
  [FeatureFlagNames.assetsDefiPositionsEnabled]: true,
  [FeatureFlagNames.tokenDetailsV2Buttons]: false,
  [FeatureFlagNames.tokenDetailsV2ButtonLayout]: false,
  [FeatureFlagNames.tronClaimUnstakedTrxButtonEnabled]: false,
  [FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled]: false,
  [FeatureFlagNames.addDeviceSyncEnabled]: {
    enabled: false,
    minimumVersion: ADD_DEVICE_SYNC_MINIMUM_VERSION,
  },
  [FeatureFlagNames.ledgerDmk]: {
    enabled: false,
    minimumVersion: null,
  },
  [FeatureFlagNames.telegramLoginEnabled]: DEFAULT_TELEGRAM_LOGIN_ENABLED,
  [FeatureFlagNames.complianceEnabled]: DEFAULT_COMPLIANCE_ENABLED,
};

/**
 * Defaults for flags whose keys are not part of {@link FeatureFlagNames}
 * (e.g. structured objects). Merged into the resolved defaults so they are
 * seeded alongside the enum-keyed toggles.
 */
export const ADDITIONAL_DEFAULT_FEATURE_FLAG_VALUES: Record<string, Json> = {
  [MOBILE_MINIMUM_VERSIONS_FLAG_NAME]: DEFAULT_MOBILE_MINIMUM_VERSIONS,
};

/**
 * Optional context for resolving default feature flags.
 *
 * Reserved for future ID-based A/B bucketing (e.g. deterministic variant
 * assignment). It is intentionally unused today so call sites do not need to
 * change when bucketed defaults are added later.
 */
export interface FeatureFlagDefaultsContext {
  /**
   * Stable id used for A/B bucketing. Callers may pass either the analytics
   * (MetaMetrics) id or the canonical id depending on what is available.
   */
  id?: string;
}

/**
 * Centralized, client-side source of truth for feature-flag default values.
 *
 * These defaults are seeded into `RemoteFeatureFlagController` state so both
 * selectors and controllers observe them before (and independently of) the
 * remote flag response. Values here act as the lowest-precedence layer:
 * persisted/fetched server flags and local overrides win over them.
 *
 * @param _context - Reserved for future ID-based bucketing. Currently unused.
 * @returns A map of feature-flag name to default value.
 */
export function getDefaultFeatureFlags(
  _context?: FeatureFlagDefaultsContext,
): Record<string, Json> {
  return {
    ...DEFAULT_FEATURE_FLAG_VALUES,
    ...ADDITIONAL_DEFAULT_FEATURE_FLAG_VALUES,
  };
}
