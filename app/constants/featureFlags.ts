import type { Json } from '@metamask/utils';

/**
 * Feature flag names that can be overridden in development tools.
 * These correspond to remote feature flags that have selector implementations
 * in app/selectors/featureFlagController/
 */
export enum FeatureFlagNames {
  rewardsEnabled = 'rewardsEnabled',
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
}

/** Minimum expected app version required for QR add-device account sync. Will update if extends */
export const ADD_DEVICE_SYNC_MINIMUM_VERSION = '8.6.0';

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
  [FeatureFlagNames.telegramLoginEnabled]: false,
};
