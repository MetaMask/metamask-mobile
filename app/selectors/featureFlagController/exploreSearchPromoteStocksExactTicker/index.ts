import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether Explore search and browser URL autocomplete promote the Stocks
 * section above Crypto when the query exactly matches an RWA `rwaData.ticker`.
 *
 * Remote flag key: `exploreSearchPromoteStocksExactTicker`. Defaults to false
 * when the flag is missing or invalid.
 */
export const selectExploreSearchPromoteStocksExactTickerEnabled =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[
      FeatureFlagNames.exploreSearchPromoteStocksExactTicker
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  });
