import { createSelector } from 'reselect';
import { PreferencesState } from '@metamask/preferences-controller';
import { EngineState } from './types';

const selectPreferencesControllerState = (state: EngineState) =>
  state.engine.backgroundState.PreferencesController;

export const selectIdentities = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.identities,
);

export const selectIpfsGateway = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.ipfsGateway,
);

export const selectSelectedAddress = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.selectedAddress,
);

export const selectFrequentRpcList = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.frequentRpcList,
);

export const selectUseNftDetection = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useNftDetection,
);

export const selectUseTokenDetection = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.useTokenDetection,
);

export const selectOpenSeaEnabled = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.openSeaEnabled,
);

export const selectDisabledRpcMethodPreferences = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    preferencesControllerState.disabledRpcMethodPreferences,
);

// isMultiAccountBalancesEnabled is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
export const selectIsMultiAccountBalancesEnabled = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        isMultiAccountBalancesEnabled: boolean;
      }
    ).isMultiAccountBalancesEnabled,
);

// showTestNetworks is a patched property - ref patches/@metamask+preferences-controller+2.1.0.patch
export const selectShowTestNetworks = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState: PreferencesState) =>
    (
      preferencesControllerState as PreferencesState & {
        showTestNetworks: boolean;
      }
    ).showTestNetworks,
);
