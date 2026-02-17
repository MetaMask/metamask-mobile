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
 * When GITHUB_ACTIONS (and not E2E): use only remote (builds.yml). Otherwise supports
 * local override via MM_ADDITIONAL_NETWORK_BLACKLIST (comma-separated chain IDs).
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

    if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
      const value = remoteValue || [];
      return Array.isArray(value) ? value : [];
    }

    const envValue = process.env.MM_ADDITIONAL_NETWORK_BLACKLIST;
    let envArray: string[] = [];

    if (envValue && typeof envValue === 'string') {
      envArray = envValue
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    const finalValue = envArray.length > 0 ? envArray : remoteValue || [];
    return Array.isArray(finalValue) ? finalValue : [];
  },
);
