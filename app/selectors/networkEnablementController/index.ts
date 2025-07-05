import { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

export const selectNetworkEnablementControllerState = (state: RootState) =>
  state.engine?.backgroundState?.NetworkEnablementController;

export const selectEnabledNetworksByNamespace = createDeepEqualSelector(
  selectNetworkEnablementControllerState,
  (networkEnablementControllerState: NetworkEnablementControllerState) =>
    networkEnablementControllerState?.enabledNetworkMap,
);
