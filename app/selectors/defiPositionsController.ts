import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { DeFiPositionsControllerState } from '@metamask/assets-controllers';
import { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { EVM_SCOPE } from '../components/UI/Earn/constants/networks';

const selectDeFiPositionsControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.DeFiPositionsController;

export const selectDeFiPositionsByAddress = createDeepEqualSelector(
  selectDeFiPositionsControllerState,
  selectSelectedInternalAccountByScope,
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedInternalAccountByScope: ReturnType<
      typeof selectSelectedInternalAccountByScope
    >,
  ): DeFiPositionsControllerState['allDeFiPositions'][string] | undefined => {
    const selectedEvmAccount = selectedInternalAccountByScope(EVM_SCOPE);

    if (!selectedEvmAccount) {
      return {};
    }

    return defiPositionsControllerState?.allDeFiPositions[
      selectedEvmAccount.address
    ];
  },
);

export const selectDefiPositionsByEnabledNetworks = createDeepEqualSelector(
  selectDeFiPositionsControllerState,
  selectSelectedInternalAccountByScope,
  selectEnabledNetworksByNamespace,
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedInternalAccountByScope: ReturnType<
      typeof selectSelectedInternalAccountByScope
    >,
    enabledNetworks: NetworkEnablementControllerState['enabledNetworkMap'],
  ): DeFiPositionsControllerState['allDeFiPositions'][string] | undefined => {
    const selectedEvmAccount = selectedInternalAccountByScope(EVM_SCOPE);
    if (!selectedEvmAccount) {
      return {};
    }

    const defiPositionByAddress =
      defiPositionsControllerState.allDeFiPositions[
        selectedEvmAccount.address
      ] ?? {};

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
