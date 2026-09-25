import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';

const DEFAULT_ROUTE_RESTORATION_ENABLED = false;

/**
 * Whether unlocking may return the user to the screen they left. Temporary
 * rollout flag, removed once the restore window is validated.
 *
 * Accepts a boolean or the version-gated shape; `{ enabled: false }` is a
 * truthy object, so it must be read rather than cast.
 */
export const selectRouteRestorationEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.routeRestoration)) {
      return DEFAULT_ROUTE_RESTORATION_ENABLED;
    }

    const rawFlag = remoteFeatureFlags[FeatureFlagNames.routeRestoration];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    return (
      validatedVersionGatedFeatureFlag(
        rawFlag as unknown as VersionGatedFeatureFlag,
      ) ?? DEFAULT_ROUTE_RESTORATION_ENABLED
    );
  },
);
