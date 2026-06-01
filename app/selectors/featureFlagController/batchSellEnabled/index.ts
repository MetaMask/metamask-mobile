import { createSelector } from 'reselect';
import { BATCH_SELL_ENABLED } from '../../../constants/bridge';
import { isRemoteFeatureFlagOverrideActivated } from '../../../core/Engine/controllers/remote-feature-flag-controller';
import { selectRemoteFeatureFlags } from '..';
import {
  BATCH_SELL_REMOTE_FLAG_FALLBACK,
  FEATURE_FLAG_NAME,
} from './constants';
import type { BatchSellEnabledFlagValue } from './types';

function isBatchSellEnabledFlagValue(
  value: unknown,
): value is BatchSellEnabledFlagValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    typeof (value as { enabled: unknown }).enabled === 'boolean'
  );
}

export const selectBatchSellEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!BATCH_SELL_ENABLED) {
      return false;
    }

    // Remote flags are not fetched in override mode, so gate on the env var only.
    if (isRemoteFeatureFlagOverrideActivated) {
      return true;
    }

    const remoteFlag = remoteFeatureFlags?.[FEATURE_FLAG_NAME];
    if (isBatchSellEnabledFlagValue(remoteFlag)) {
      return remoteFlag.enabled;
    }

    return BATCH_SELL_REMOTE_FLAG_FALLBACK;
  },
);
