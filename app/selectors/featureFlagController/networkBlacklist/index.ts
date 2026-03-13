import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../index';

export interface AdditionalNetworksBlacklistFeatureFlag {
  additionalNetworksBlacklist: string[];
}

/**
 * Selector to get the additional networks blacklist feature flag from remote feature flags.
 * Allows to remove a network from the additional network selection.
 * Returns an array of chain IDs that should be hidden from the Additional Networks list.
 *
 * Supports local environment variable override via MM_ADDITIONAL_NETWORK_BLACKLIST
 * (comma-separated chain IDs, e.g., "0x8f,0x531")
 *
 * @param state - The Redux state
 * @returns Array of blacklisted chain IDs
 */
export const selectAdditionalNetworksBlacklistFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = remoteFeatureFlags.additionalNetworksBlacklist as
      | string[]
      | undefined;

    // Parse environment variable override
    const envValue = process.env.MM_ADDITIONAL_NETWORK_BLACKLIST;
    let envArray: string[] = [];

    if (envValue && typeof envValue === 'string') {
      envArray = envValue
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    // Use environment variable if provided, otherwise use remote value, fallback to empty array
    const finalValue = envArray.length > 0 ? envArray : remoteValue || [];

    // Ensure we return an array of strings
    return Array.isArray(finalValue) ? finalValue : [];
  },
);
