import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Preview branch forces Liquid Glass on so home surfaces can be reviewed
 * without the LaunchDarkly flag. Remote config still has to be a valid
 * version-gated flag for the helper; this bypasses that for the preview.
 */
const PREVIEW_FORCE_HOME_BRAND_REFRESH_SURFACES = true;

/** Brand refresh Liquid Glass + gradient on the home CTA tiles and banners. */
export const selectHomeBrandRefreshSurfacesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (PREVIEW_FORCE_HOME_BRAND_REFRESH_SURFACES) {
      return true;
    }

    return (
      validatedVersionGatedFeatureFlag(
        remoteFeatureFlags?.[FeatureFlagNames.homeBrandRefreshSurfaces],
      ) ?? false
    );
  },
);
