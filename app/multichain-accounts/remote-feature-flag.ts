import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

/**
 * Multichain accounts is permanently enabled. The remote feature flag is no longer required.
 * @returns Always true.
 */
export const isMultichainAccountsRemoteFeatureEnabled = (
  _remoteFeatureFlags: FeatureFlags,
  _featureVersionsToCheck: {
    version: string;
    featureKey: keyof FeatureFlags;
  }[],
  _override?: string,
): boolean => true;

/**
 * Checks if multichain accounts state 2 is enabled.
 * @returns Always true — the feature is permanently enabled.
 */
export const isMultichainAccountsState2Enabled = (): boolean => true;
