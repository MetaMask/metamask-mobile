import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const FEATURE_FLAG_NAME = 'assetsAccountApiBalances';

export const selectAssetsAccountApiBalancesEnabled = createSelector(
  selectRemoteFeatureFlags,
  () => [
    '0x1',
    '0xe708',
    '0x38',
    '0x89',
    '0x2105',
    '0xa',
    '0xa4b1',
    '0x531',
    '0x82750',
  ],
);
