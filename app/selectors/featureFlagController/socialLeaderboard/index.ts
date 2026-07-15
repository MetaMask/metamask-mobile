import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const selectSocialLeaderboardEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.aiSocialLeaderboardEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectSocialLeaderboardPerpsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.aiSocialLeaderboardPerpsEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectSocialFeedEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.aiSocialFeedEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectAiSocialLeaderboardOnboardingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.aiSocialLeaderboardOnboardingEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectSocialAIQuickBuyStreamQuotesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.socialAIQuickBuyStreamQuotes as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
