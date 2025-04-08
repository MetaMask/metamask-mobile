import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../';
import { getFeatureFlagValue } from '../env';

export const selectProductSafetyDappScanningEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => getFeatureFlagValue(
    process.env.FEATURE_FLAG_PRODUCT_SAFETY_DAPP_SCANNING,
    (remoteFeatureFlags?.productSafetyDappScanning as boolean),
  )
);
