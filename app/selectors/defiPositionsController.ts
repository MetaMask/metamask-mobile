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

export const selectDefiPositionsByEnabledNetworks = createDeepEqualSelector(
  selectDeFiPositionsControllerState,
  selectSelectedInternalAccountAddress,
  selectEnabledNetworksByNamespace,
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedAddress: string | undefined,
    enabledNetworks: NetworkEnablementControllerState['enabledNetworkMap'],
  ): DeFiPositionsControllerState['allDeFiPositions'][string] | undefined => {
    if (!selectedAddress) {
      return {};
    }

    const defiPositionByAddress =
      defiPositionsControllerState.allDeFiPositions[selectedAddress as Hex] ??
      {};

    if (Object.keys(defiPositionByAddress).length === 0) {
      return {};
    }

    const defiPositionByEnabledNetworks =
      enabledNetworks[KnownCaipNamespace.Eip155];

    if (!defiPositionByEnabledNetworks) {
      return {};
    }

    const enabledChainIdsSet = new Set(
      Object.keys(defiPositionByEnabledNetworks).filter(
        (chainId) => defiPositionByEnabledNetworks[chainId as Hex],
      ),
    );

    if (enabledChainIdsSet.size === 0) {
      return {};
    }

    const filteredDefiPositionByAddress = Object.keys(defiPositionByAddress)
      .filter((chainId) => enabledChainIdsSet.has(chainId))
      .reduce(
        (
          acc: DeFiPositionsControllerState['allDeFiPositions'][Hex],
          chainId,
        ) => {
          if (acc) {
            acc[chainId as Hex] = defiPositionByAddress[chainId as Hex];
          }
          return acc;
        },
        {} as DeFiPositionsControllerState['allDeFiPositions'][Hex],
      );

    return filteredDefiPositionByAddress;
  },
);
