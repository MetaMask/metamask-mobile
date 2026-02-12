import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Selector for token list item V2 A/B test from LaunchDarkly.
 * Boolean flag: true = V2 layout, false/null = V1 layout (control).
 * LD flag name: token-list-item-v2-abtest -> camelCased to tokenListItemV2Abtest
 *
 * @returns true if V2 layout is enabled, false otherwise
 */
export const selectTokenListLayoutV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    remoteFeatureFlags?.tokenListItemV2Abtest === true,
);
