import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const selectMarketInsightsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.aiSocialMarketAnalysisEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? true;
  },
);
