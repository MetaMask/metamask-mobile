import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/** Interim home header and tab bar: brand refresh + Liquid Glass without Socials. */
export const selectInterimHeaderNavBarEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.[FeatureFlagNames.homeInterimHeaderNavBar],
    ) ?? false,
);
