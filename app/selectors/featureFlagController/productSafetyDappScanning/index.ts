import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../';
// import { hasProperty } from '@metamask/utils';

const DEFAULT_PRODUCT_SAFETY_DAPP_SCANNING_ENABLED = false;
export const FEATURE_FLAG_NAME = 'productSafetyDappScanning';

export const selectProductSafetyDappScanningEnabled = createSelector(
  selectRemoteFeatureFlags,
  () => DEFAULT_PRODUCT_SAFETY_DAPP_SCANNING_ENABLED,
  // When feature is ready for production, use this implementation:
  // (remoteFeatureFlags) => hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME) ? remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean : DEFAULT_PRODUCT_SAFETY_DAPP_SCANNING_ENABLED,
);
