import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * LaunchDarkly key for the technical indicators feature.
 * Note: LD keys use kebab-case; the client-config registry stores the camelCase variant.
 */
export const TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY =
  'tokenDetailsTechnicalIndicators' as const;

/**
 * Whether the token details screen should show technical indicators
 * (IntervalBar, IndicatorBar, chart overlays).
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "7.xx" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies `minimumVersion`.
 * Otherwise `false` (standard chart without indicators).
 */
export const selectTokenDetailsTechnicalIndicatorsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[TOKEN_DETAILS_TECHNICAL_INDICATORS_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
