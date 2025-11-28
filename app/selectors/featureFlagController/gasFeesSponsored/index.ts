import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

export const FEATURE_FLAG_NAME = 'gasFeesSponsoredNetwork';
const DEFAULT_GAS_FEES_SPONSORED_MAP: Record<string, boolean> = {};

export const getGasFeesSponsoredNetworkEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const map =
      hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME) &&
      typeof remoteFeatureFlags[FEATURE_FLAG_NAME] === 'object' &&
      remoteFeatureFlags[FEATURE_FLAG_NAME] !== null
        ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as Record<string, boolean>)
        : DEFAULT_GAS_FEES_SPONSORED_MAP;

    return (chainId: string) => Boolean(map[chainId]);
  },
);
