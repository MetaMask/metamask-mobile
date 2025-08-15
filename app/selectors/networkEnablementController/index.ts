import { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { Hex } from '@metamask/utils';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

export const selectNetworkEnablementControllerState = (state: RootState) =>
  state.engine?.backgroundState?.NetworkEnablementController;

export const selectEnabledNetworksByNamespace = createDeepEqualSelector(
  selectNetworkEnablementControllerState,
  (networkEnablementControllerState: NetworkEnablementControllerState) =>
    networkEnablementControllerState?.enabledNetworkMap ?? {},
);

export const selectEVMEnabledNetworks = createDeepEqualSelector(
  selectEnabledNetworksByNamespace,
  (
    enabledNetworksByNamespace: NetworkEnablementControllerState['enabledNetworkMap'],
  ) =>
    Object.keys(enabledNetworksByNamespace?.eip155 ?? {}).filter(
      (chainId) => enabledNetworksByNamespace?.eip155?.[chainId as Hex],
    ) as Hex[],
);
