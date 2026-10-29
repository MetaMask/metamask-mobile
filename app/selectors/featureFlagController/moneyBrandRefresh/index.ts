import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/** Brand refresh on the Money screen: native glass header, glass CTA tiles, cards and buttons. */
export const selectMoneyBrandRefreshEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.[FeatureFlagNames.moneyBrandRefresh],
    ) ?? false,
);
