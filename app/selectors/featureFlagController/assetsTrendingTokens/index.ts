import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import compareVersions from 'compare-versions';
import packageJson from '../../../../package.json';
import { isE2E } from '../../../util/test/utils';

const APP_VERSION = packageJson.version;

/**
 * Assets trending tokens feature flag interface
 */
export interface AssetsTrendingTokensFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
}

/**
 * Checks if the assets trending tokens feature flag is enabled based on remote flag and app version.
 *
 * @param flagValue - The feature flag value from remote config
 * @returns boolean - True if the feature is enabled and version requirement is met, false otherwise.
 */
export const evaluateAssetsTrendingTokensRemoteFlag = (
  flagValue: unknown,
): boolean => {
  // Validate flag value exists
  if (!flagValue || !APP_VERSION) {
    return false;
  }

  // Handle simple boolean flag
  if (typeof flagValue === 'boolean') {
    return flagValue;
  }

  // Handle object with enabled and minimumVersion properties
  if (typeof flagValue === 'object' && flagValue !== null) {
    const flag = flagValue as AssetsTrendingTokensFeatureFlag;
    const { enabled, minimumVersion } = flag;

    if (!enabled) {
      return false;
    }

    // Require minimumVersion for safety
    if (!minimumVersion || typeof minimumVersion !== 'string') {
      return false;
    }

    try {
      // Check if current app version meets minimum requirement
      return compareVersions.compare(APP_VERSION, minimumVersion, '>=');
    } catch {
      return false;
    }
  }

  return false;
};

/**
 * Checks if the assets trending tokens feature flag is enabled.
 * Supports environment variable override (OVERRIDE_REMOTE_FEATURE_FLAGS + ASSETS_TRENDING_TOKENS_ENABLED).
 *
 * @param flagValue - The feature flag value from remote config
 * @param envOverride - Optional environment variable override value
 * @returns boolean - True if the feature is enabled, false otherwise.
 */
export const isAssetsTrendingTokensFeatureEnabled = (
  flagValue: unknown,
  envOverride?: string,
): boolean => {
  // Check for override from environment variables
  if (envOverride === 'true') {
    return true;
  }
  if (envOverride === 'false') {
    return false;
  }

  // Fall back to evaluating remote flag with version check
  return evaluateAssetsTrendingTokensRemoteFlag(flagValue);
};

// We are enabling this feature flag to be enabled by default for non-E2E builds
const forcedTrueOverride = () => (!isE2E ? 'true' : undefined);

/**
 * Selector to check if the assets trending tokens feature flag is enabled.
 * Supports environment variable override (OVERRIDE_REMOTE_FEATURE_FLAGS + ASSETS_TRENDING_TOKENS_ENABLED).
 * Checks that enabled is true and current app version >= minimumVersion.
 */
export const selectAssetsTrendingTokensEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const { trendingTokens: assetsTrendingTokensEnabled } = remoteFeatureFlags;
    const envOverride =
      process.env.OVERRIDE_REMOTE_FEATURE_FLAGS &&
      process.env.ASSETS_TRENDING_TOKENS_ENABLED;

    const value =
      assetsTrendingTokensEnabled &&
      typeof assetsTrendingTokensEnabled === 'object' &&
      'value' in assetsTrendingTokensEnabled
        ? assetsTrendingTokensEnabled.value
        : assetsTrendingTokensEnabled;

    return isAssetsTrendingTokensFeatureEnabled(
      value,
      forcedTrueOverride() || envOverride || undefined,
    );
  },
);
