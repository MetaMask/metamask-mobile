import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { FeatureFlagNames } from '../../../constants/featureFlags';

/**
 * TEMPORARY (ASSETS-4102 spike): force the feature on so the raw-API avatar
 * markers can be validated on a device before the remote flag exists.
 * REVERT to `false` (or delete) before merge.
 */
const FORCE_ENABLE_FOR_SPIKE: boolean = true;

/**
 * Chart Social Markers (ASSETS-4102): render follower avatar markers on the
 * Token Details price chart. Version-gated remote flag; defaults to off.
 */
export const selectChartSocialMarkersEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (FORCE_ENABLE_FOR_SPIKE) return true;

    const localFlag =
      process.env.MM_TOKEN_DETAILS_CHART_SOCIAL_MARKERS === 'true';
    const remoteFlag = remoteFeatureFlags?.[
      FeatureFlagNames.tokenDetailsChartSocialMarkers
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
