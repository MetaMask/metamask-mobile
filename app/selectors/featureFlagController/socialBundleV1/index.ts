import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Gates the Social Bundle V1 prototype (TSA-1121).
 *
 * Prototype-only: an isolated Follow Trading surface (Home + tabs + Feed) that
 * lives under `app/components/Views/SocialBundleV1/` and does not share
 * components with the shipped SocialLeaderboard feature. When this flag is on,
 * the wallet home "Traders" button navigates to the prototype instead of the
 * shipped feature.
 */
export const selectAiSocialBundleV1Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.aiSocialBundleV1Enabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
