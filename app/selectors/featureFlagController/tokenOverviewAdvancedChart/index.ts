import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Registry / client-config key — camelCase like `tokenDetailsV2AbTest`, `trxStakingEnabled`, etc.
 */
export const TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY =
  'tokenDetailsAdvancedCharts' as const;

/**
 * Whether the token overview should use the advanced (OHLCV / TradingView) chart.
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "7.73" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies `minimumVersion`.
 * Otherwise `false` (legacy chart), including invalid or missing payloads.
 */
export const selectTokenOverviewAdvancedChartEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    return true;
    const remoteFlag =
      remoteFeatureFlags?.[TOKEN_DETAILS_ADVANCED_CHARTS_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
