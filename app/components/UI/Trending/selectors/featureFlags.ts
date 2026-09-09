import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';

export const EXPLORE_LAPTOP_SEARCH_API_RANKING_FLAG_NAME =
  'exploreLaptopSearchApiRanking';

/**
 * TEMPORARY: Defaults on so the LAPTOP search pin works before the remote
 * flag exists. Set the remote flag `enabled` to false to restore the existing
 * trending-first merge and market-cap sort without a new app release.
 */
const DEFAULT_EXPLORE_LAPTOP_SEARCH_API_RANKING_ENABLED = true;

export const selectExploreLaptopSearchApiRankingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[
      EXPLORE_LAPTOP_SEARCH_API_RANKING_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_EXPLORE_LAPTOP_SEARCH_API_RANKING_ENABLED
    );
  },
);
