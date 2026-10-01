import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { ROUTE_RESTORE_WINDOW_MS } from '../../../util/navigation/routeRestoration';

const DEFAULT_ROUTE_RESTORATION_ENABLED = false;

export interface RouteRestorationSettings {
  enabled: boolean;
  /** Client constant (`ROUTE_RESTORE_WINDOW_MS`); not read from remote in V1. */
  restoreWindowMs: number;
}

const defaultSettings = (): RouteRestorationSettings => ({
  enabled: DEFAULT_ROUTE_RESTORATION_ENABLED,
  restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
});

/**
 * Enablement only. Allowlist and window are client constants in V1.
 * Remote `allowedRouteIds` / `restoreWindowMs` are ignored.
 */
export const selectRouteRestorationSettings = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): RouteRestorationSettings => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.routeRestoration)) {
      return defaultSettings();
    }

    const rawFlag = remoteFeatureFlags[FeatureFlagNames.routeRestoration];

    if (typeof rawFlag === 'boolean') {
      return {
        enabled: rawFlag,
        restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
      };
    }

    const enabled =
      validatedVersionGatedFeatureFlag(
        rawFlag as unknown as VersionGatedFeatureFlag,
      ) ?? DEFAULT_ROUTE_RESTORATION_ENABLED;

    return {
      enabled,
      restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
    };
  },
);

/**
 * Whether unlocking may return the user to the screen they left.
 *
 * Accepts a boolean or the version-gated shape; `{ enabled: false }` is a
 * truthy object, so it must be read rather than cast.
 */
export const selectRouteRestorationEnabled = createSelector(
  selectRouteRestorationSettings,
  (settings): boolean => settings.enabled,
);
