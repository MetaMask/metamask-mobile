import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const TOKEN_LIST_LAYOUT_FLAG_KEY = 'tokenListItemV2AbtestVersioned';

/**
 * Selector for token list item V2 A/B test from LaunchDarkly.
 * Returns true if V2 layout is enabled AND the current app version meets
 * the minimum version requirement.
 *
 * LD flag name: token-list-item-v2-abtest -> camelCased to tokenListItemV2Abtest
 * Expected flag shape: { enabled: boolean, minimumVersion: string }
 *
 * @returns true if V2 layout is enabled, false otherwise
 */
export const selectTokenListLayoutV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags[
      TOKEN_LIST_LAYOUT_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
