import { Hex } from '@metamask/utils';
import { DeFiPositionsControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { EVM_SCOPE } from '../components/UI/Earn/constants/networks';

const NO_DATA: NonNullable<
  DeFiPositionsControllerState['allDeFiPositions'][string]
> = {};

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
      return NO_DATA;
    }

    return defiPositionsControllerState?.allDeFiPositions[
      selectedEvmAccount.address
    ];
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

export const makeSelectDefiPositionsByChainIds =
  (chainIds: Hex[] | undefined) => (state: RootState) =>
    selectDefiPositionsByChainIds(state, chainIds);
