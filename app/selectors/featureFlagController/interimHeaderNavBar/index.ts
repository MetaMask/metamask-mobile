import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Preview branch forces the interim header and floating tab bar on so the
 * footer can be reviewed without the LaunchDarkly flag.
 */
const PREVIEW_FORCE_INTERIM_HEADER_NAV_BAR = true;

/** Interim home header and tab bar: brand refresh + Liquid Glass without Socials. */
export const selectInterimHeaderNavBarEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (PREVIEW_FORCE_INTERIM_HEADER_NAV_BAR) {
      return true;
    }

    return (
      validatedVersionGatedFeatureFlag(
        remoteFeatureFlags?.[FeatureFlagNames.homeInterimHeaderNavBar],
      ) ?? false
    );
  },
);
