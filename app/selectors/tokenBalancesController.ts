/* eslint-disable import/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { selectShowFiatInTestnets } from './settings';
import { isTestNet } from '../util/networks';

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
    chainId: string,
  ) =>
    tokenBalancesControllerState.tokenBalances?.[
      selectedInternalAccountAddress as Hex
    ]?.[chainId as Hex] ?? {},
);

export const selectContractBalancesPerChainId = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
  ) =>
    tokenBalancesControllerState.tokenBalances?.[
      selectedInternalAccountAddress as Hex
    ] ?? {},
);

export const selectAllTokenBalances = createDeepEqualSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);

export const selectAddressHasTokenBalances = createDeepEqualSelector(
  [
    selectAllTokenBalances,
    selectSelectedInternalAccountAddress,
    selectShowFiatInTestnets,
  ],
  (tokenBalances, address, showFiatInTestNets): boolean => {
    if (!address) {
      return false;
    }

    const addressChainTokens = tokenBalances[address as Hex] ?? {};
    const chainTokens = Object.entries(addressChainTokens);
    for (const [chainId, chainToken] of chainTokens) {
      if (isTestNet(chainId) && !showFiatInTestNets) {
        continue;
      }

      const hexBalances = Object.values(chainToken ?? {});
      if (
        hexBalances.some((hexBalance) => hexBalance && hexBalance !== '0x0')
      ) {
        return true;
      }
    }

    // Exhausted all tokens for given account address
    return false;
  },
);
