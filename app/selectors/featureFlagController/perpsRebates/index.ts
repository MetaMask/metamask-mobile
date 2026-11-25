import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  type VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether Perps rebate quotes are shown in trade and position confirmations.
 *
 * Kept separate from the Rewards Money controller flag so Perps can be
 * disabled independently if its quote-card integration has a problem.
 */
export const selectPerpsRebatesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.perpsRebatesEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
