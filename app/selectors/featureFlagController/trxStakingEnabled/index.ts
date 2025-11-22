import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const selectTrxStakingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    return false;
    const remoteFlag =
      remoteFeatureFlags?.trxStakingEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
