/* eslint-disable import-x/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { selectShowFiatInTestnets } from './settings';
import { isTestNet } from '../util/networks';
import { getTokenBalancesControllerTokenBalances } from './assets/assets-migration';

export { getTokenBalancesControllerTokenBalances as selectTokensBalances };

export const selectHasAnyBalance = createSelector(
  [getTokenBalancesControllerTokenBalances],
  (balances) => {
    // We will loop through this nested structure to see if we find any balance.
    for (const level2 of Object.values(balances)) {
      for (const level3 of Object.values(level2)) {
        if (Object.keys(level3).length > 0) {
          return true;
        }
      }
    }
    return false;
  },
);

export const selectSingleTokenBalance = createSelector(
  [
    (
      state: RootState,
      accountAddress: Hex,
      chainId: Hex,
      tokenAddress: Hex,
    ) => {
      const tokenBalances = getTokenBalancesControllerTokenBalances(state);
      const balance =
        tokenBalances?.[accountAddress]?.[chainId]?.[tokenAddress];
      return balance;
    },
    (
      _state: RootState,
      _accountAddress: Hex,
      _chainId: Hex,
      tokenAddress: Hex,
    ) => tokenAddress,
  ],
  (balance, tokenAddress) => (balance ? { [tokenAddress]: balance } : {}),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectContractBalances = createSelector(
  getTokenBalancesControllerTokenBalances,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  (
    tokenBalances: TokenBalancesControllerState['tokenBalances'],
    selectedInternalAccountAddress: string | undefined,
    chainId: string,
  ) =>
    tokenBalances?.[selectedInternalAccountAddress as Hex]?.[chainId as Hex] ??
    {},
);

export const selectContractBalancesPerChainId = createSelector(
  getTokenBalancesControllerTokenBalances,
  selectSelectedInternalAccountAddress,
  (
    tokenBalances: TokenBalancesControllerState['tokenBalances'],
    selectedInternalAccountAddress: string | undefined,
  ) => tokenBalances?.[selectedInternalAccountAddress as Hex] ?? {},
);

export { getTokenBalancesControllerTokenBalances as selectAllTokenBalances };

export const selectAddressHasTokenBalances = createDeepEqualSelector(
  [
    getTokenBalancesControllerTokenBalances,
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
