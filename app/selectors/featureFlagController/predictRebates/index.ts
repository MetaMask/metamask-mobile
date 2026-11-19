import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  type VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether Predict rebate quotes are shown on the Predict buy screens.
 *
 * Kept separate from the Rewards Money controller flag so Predict can be
 * disabled independently if its quote-card integration has a problem.
 */
export const selectPredictRebatesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.predictRebatesEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
