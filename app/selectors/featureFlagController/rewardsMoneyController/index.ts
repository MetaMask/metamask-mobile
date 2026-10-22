import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether the Rewards Money controller surface is enabled.
 *
 * Remote flag key: `rewardsMoneyControllerEnabled`. Defaults to false when the
 * flag is missing or invalid — there is deliberately no env-var fallback.
 */
export const selectRewardsMoneyControllerEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.rewardsMoneyControllerEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
