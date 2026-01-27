import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { DeFiPositionsControllerState } from '@metamask/assets-controllers';
import { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { EVM_SCOPE } from '../components/UI/Earn/constants/networks';

const NO_DATA: NonNullable<
  DeFiPositionsControllerState['allDeFiPositions'][string]
> = {};

// TODO Unified Assets Controller State Access (1)
// DeFiPositionsController: allDeFiPositions
// References
// app/selectors/defiPositionsController.ts (2)
const selectDeFiPositionsControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.DeFiPositionsController;

// TODO Unified Assets Controller State Access (1)
// DeFiPositionsController: allDeFiPositions
// References
// app/components/UI/DeFiPositions/DeFiPositionsList.tsx (1)
/**
 * @deprecated This selector is deprecated and will be removed in a future release.
 * Use selectDefiPositionsByEnabledNetworks instead.
 */
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
      return NO_DATA;
    }

    return defiPositionsControllerState?.allDeFiPositions[
      selectedEvmAccount.address
    ];
  },
);

// TODO Unified Assets Controller State Access (1)
// DeFiPositionsController: allDeFiPositions
// References
// app/components/UI/DeFiPositions/DeFiPositionsList.tsx (1)
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
      return NO_DATA;
    }

    const defiPositionByAddress =
      defiPositionsControllerState?.allDeFiPositions[
        selectedEvmAccount.address
      ];

    if (defiPositionByAddress == null) {
      return defiPositionByAddress;
    }

    const defiPositionByEnabledNetworks =
      enabledNetworks[KnownCaipNamespace.Eip155];

    if (!defiPositionByEnabledNetworks) {
      return NO_DATA;
    }

    const enabledChainIdsSet = new Set(
      Object.keys(defiPositionByEnabledNetworks).filter(
        (chainId) => defiPositionByEnabledNetworks[chainId as Hex],
      ),
    );

    if (enabledChainIdsSet.size === 0) {
      return NO_DATA;
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
