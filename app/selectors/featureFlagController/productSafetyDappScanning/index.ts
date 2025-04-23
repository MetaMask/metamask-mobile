import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../';
import { hasProperty } from '@metamask/utils';

const DEFAULT_PRODUCT_SAFETY_DAPP_SCANNING_ENABLED = true;
export const FEATURE_FLAG_NAME = 'productSafetyDappScanning';

export const selectProductSafetyDappScanningEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_PRODUCT_SAFETY_DAPP_SCANNING_ENABLED,
);
