import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Registry / client-config key — camelCase like `tokenDetailsAdvancedCharts`,
 * `trxStakingEnabled`, etc. (hyphenated LaunchDarkly keys are normalized for the mobile payload.)
 */
export const TOKEN_DETAILS_OHLCV_WS_INTEGRATION_FLAG_KEY =
  'tokenDetailsOhlcvWsIntegration' as const;

/**
 * Whether the token details advanced chart should use real-time WebSocket
 * OHLCV candle updates (via OHLCVService).
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "7.73" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies `minimumVersion`.
 * Otherwise `false`, including invalid or missing payloads.
 */
export const selectTokenDetailsOhlcvWsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[TOKEN_DETAILS_OHLCV_WS_INTEGRATION_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
