import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Selector for token list item V2 A/B test from LaunchDarkly.
 * Returns true if V2 layout is enabled AND the current app version meets
 * the minimum version requirement.
 *
 * LD flag name: token-list-item-v2-abtest-versioned
 * Expected flag shape: { enabled: boolean, minimumVersion: string }
 *
 * @returns true if V2 layout is enabled, false otherwise
 */
export const selectTokenListLayoutV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.tokenListItemV2AbtestVersioned;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
