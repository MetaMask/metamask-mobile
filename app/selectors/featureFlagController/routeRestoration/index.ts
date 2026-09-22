import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';

const DEFAULT_ROUTE_RESTORATION_ENABLED = true;

/**
 * Whether unlocking may return the user to the screen they left.
 *
 * Staged rollout only: the flag exists to validate the restore window against a
 * slice of users before full exposure, and is removed once that is settled.
 */
export const selectRouteRestorationEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.routeRestoration)) {
      return DEFAULT_ROUTE_RESTORATION_ENABLED;
    }

    const rawFlag = remoteFeatureFlags[FeatureFlagNames.routeRestoration];

    // Boolean dev-tool local overrides take precedence.
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
