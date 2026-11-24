import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';
import { FeatureFlagNames } from '../../../constants/featureFlags';

/**
 * Chart Social Markers (ASSETS-4102): render follower avatar markers on the
 * Token Details price chart.
 *
 * Remote flag key: `tokenDetailsChartSocialMarkers`, shape
 * `{ enabled: boolean, minimumVersion: string }` (direct or wrapped in a
 * progressive rollout `{ value: ... }`). The remote flag wins when valid;
 * otherwise falls back to the local `MM_TOKEN_DETAILS_CHART_SOCIAL_MARKERS`
 * env var (defaults off).
 */
export const selectChartSocialMarkersEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag =
      process.env.MM_TOKEN_DETAILS_CHART_SOCIAL_MARKERS === 'true';
    const remoteFlag =
      remoteFeatureFlags?.[FeatureFlagNames.tokenDetailsChartSocialMarkers];

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
