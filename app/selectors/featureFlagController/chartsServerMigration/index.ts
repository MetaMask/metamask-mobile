import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * LaunchDarkly key `charts-server-migration`, normalized to camelCase in the mobile payload.
 */
export const CHARTS_SERVER_MIGRATION_FLAG_KEY =
  'chartsServerMigration' as const;

/**
 * Whether Token Details advanced charts should load from the charts server
 * (iframe-hosted DOM via URL) instead of the locally bundled chart code.
 *
 * LD variation: `{ "enabled": boolean, "minimumVersion": "x.y.z" }` (direct or `{ value: ... }`).
 * Returns true only when enabled and app version >= minimumVersion; false otherwise.
 */
export const selectChartsServerMigrationEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[CHARTS_SERVER_MIGRATION_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
