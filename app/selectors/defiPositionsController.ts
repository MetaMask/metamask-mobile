import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { DeFiPositionsControllerState } from '@metamask/assets-controllers';
import { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';

const selectDeFiPositionsControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.DeFiPositionsController;

export const selectDeFiPositionsByAddress = createDeepEqualSelector(
  selectDeFiPositionsControllerState,
  selectSelectedInternalAccountAddress,
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedAddress: string | undefined,
  ): DeFiPositionsControllerState['allDeFiPositions'][string] | undefined =>
    defiPositionsControllerState?.allDeFiPositions[selectedAddress as Hex],
);

// TODO: Come back to clean up this selector and fix type issues due to the
// actual network enable controller not being installed correctly. Its being installed locally
export const selectDefiPositionsByEnabledNetworks = createDeepEqualSelector(
  selectDeFiPositionsControllerState,
  selectSelectedInternalAccountAddress,
  selectEnabledNetworksByNamespace,
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedAddress: string,
    enabledNetworks: NetworkEnablementControllerState[],
  ): DeFiPositionsControllerState['allDeFiPositions'][string] | undefined => {
    const defiPositionByAddress =
      defiPositionsControllerState.allDeFiPositions[selectedAddress as Hex] ??
      {};
    const defiPositionByEnabledNetworks =
      enabledNetworks[KnownCaipNamespace.Eip155];

    const enabledChainIds = Object.keys(defiPositionByEnabledNetworks).filter(
      (chainId) => defiPositionByEnabledNetworks[chainId],
    );

    const filteredDefiPositionByAddress = Object.keys(defiPositionByAddress)
      .filter((chainId) => enabledChainIds.includes(chainId))
      .reduce((acc, chainId) => {
        acc[chainId] = defiPositionByAddress[chainId];
        return acc;
      }, {});

    return filteredDefiPositionByAddress;
  },
);
