import { createSelector } from 'reselect';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlags } from '..';

const FEATURE_FLAG_NAME = 'routeRestoration';

/**
 * Whether unlocking may return the user to the screen they left.
 *
 * Staged rollout only: the flag exists to validate the restore window against a
 * slice of users before full exposure, and is removed once that is settled.
 */
export const selectRouteRestorationEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[
      FEATURE_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
