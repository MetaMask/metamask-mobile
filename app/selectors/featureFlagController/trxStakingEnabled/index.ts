import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const selectTrxStakingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.trxStakingEnabled as unknown as VersionGatedFeatureFlag;

    console.log('remoteFlag', remoteFlag);
    console.log('validatedVersionGatedFeatureFlag', validatedVersionGatedFeatureFlag(remoteFlag));
    // TODO: Comeback and check this
    return true;
    // return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
