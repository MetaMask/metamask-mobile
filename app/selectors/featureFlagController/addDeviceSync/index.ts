import { createSelector } from 'reselect';
import type { RootState } from '../../../reducers';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

export const selectAddDeviceSyncEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.addDeviceSyncEnabled] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.addDeviceSyncEnabled],
    ),
);

const selectQrSyncControllerState = (state: RootState) =>
  state.engine.backgroundState.QrSyncController;

export const selectQrSyncPrimaryMnemonic = createSelector(
  selectQrSyncControllerState,
  (qrSyncControllerState) =>
    qrSyncControllerState?.importPlan?.primaryMnemonic?.value ?? null,
);
