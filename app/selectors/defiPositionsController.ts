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

const selectDeFiPositionsControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.DeFiPositionsController;

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

/**
 * DeFi positions for the selected EVM account, filtered by an explicit list of chain IDs.
 * @param state - Redux state
 * @param chainIds - Hex chain IDs to include (e.g. from listPopularEvmNetworks())
 * @returns Positions by chain ID for the selected account, or NO_DATA if no account / no positions
 */
export const selectDefiPositionsByChainIds = createDeepEqualSelector(
  [
    selectDeFiPositionsControllerState,
    selectSelectedInternalAccountByScope,
    (_state: RootState, chainIds: Hex[] | undefined) => chainIds,
  ],
  (
    defiPositionsControllerState: DeFiPositionsControllerState,
    selectedInternalAccountByScope: ReturnType<
      typeof selectSelectedInternalAccountByScope
    >,
    chainIds: Hex[] | undefined,
  ): DeFiPositionsControllerState['allDeFiPositions'][Hex] | undefined => {
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

    if (!chainIds || chainIds.length === 0) {
      return NO_DATA;
    }

    const chainIdsSet = new Set(chainIds);
    const filtered = Object.keys(defiPositionByAddress)
      .filter((chainId) => chainIdsSet.has(chainId as Hex))
      .reduce<DeFiPositionsControllerState['allDeFiPositions'][Hex]>(
        (acc, chainId) => {
          const value = defiPositionByAddress[chainId as Hex];
          if (value != null && acc) {
            acc[chainId as Hex] = value;
          }
          return acc;
        },
        {} as DeFiPositionsControllerState['allDeFiPositions'][Hex],
      );

    return filtered;
  },
);
