import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

export const SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY =
  'socialAiAssetDetailsQuickBuy' as const;

export const selectSocialAiAssetDetailsQuickBuyEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
