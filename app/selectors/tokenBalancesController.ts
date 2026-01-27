/* eslint-disable import/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { selectShowFiatInTestnets } from './settings';
import { isTestNet } from '../util/networks';

// TODO Unified Assets Controller State Access (1)
// TokenBalancesController: tokenBalances
// References
// app/selectors/tokenBalancesController.ts (6)
const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

// TODO Unified Assets Controller State Access (1)
// TokenBalancesController: tokenBalances
// References
// app/selectors/tokenBalancesController.ts (1)
// app/selectors/earnController/earn/index.ts (1)
// app/selectors/multichain/evm.ts (2)
// app/components/Views/AssetDetails/index.tsx (1)
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts (1)
// app/components/Views/DetectedTokens/components/Token.tsx (1)
export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);

export const selectHasAnyBalance = createSelector(
  [selectTokensBalances],
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

// TODO Unified Assets Controller State Access (1)
// TokenBalancesController: tokenBalances
// References
// app/components/Views/confirmations/hooks/tokens/useTokenWithBalance.ts (1)
export const selectSingleTokenBalance = createSelector(
  [
    (
      state: RootState,
      accountAddress: Hex,
      chainId: Hex,
      tokenAddress: Hex,
    ) => {
      const tokenBalances =
        selectTokenBalancesControllerState(state).tokenBalances;
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

// TODO Unified Assets Controller State Access (1)
// TokenBalancesController: tokenBalances
// References
// app/reducers/swaps/index.js (2)
// app/components/Views/confirmations/legacy/SendFlow/Amount/index.js (1)
// app/components/UI/Swaps/index.js (1)
// app/components/UI/Swaps/components/TokenSelectModal.js (1)
// app/components/UI/Swaps/QuotesView.js (1)
// app/core/GasPolling/GasPolling.ts (1)
// app/components/hooks/useAddressBalance/useAddressBalance.ts (1)
// app/components/Views/confirmations/legacy/SendFlow/Confirm/index.js (1)
// app/components/Views/confirmations/legacy/Send/index.js (1)
// app/components/Views/confirmations/legacy/Approval/components/TransactionEditor/index.js (1)
// app/components/hooks/useTokenBalancesController/useTokenBalancesController.ts (1)
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

// TODO Unified Assets Controller State Access (1)
// TokenBalancesController: tokenBalances
// References
// app/components/UI/Earn/hooks/useHasMusdBalance.ts (1)
// app/components/UI/Ramp/Aggregator/hooks/useBalance.ts (1)
// app/components/hooks/useAddressBalance/useAddressBalance.ts (1)
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

// TODO Unified Assets Controller State Access (1)
// TokenBalancesController: tokenBalances
// References
// app/selectors/tokenBalancesController.ts (1)
// app/selectors/assets/balances.ts (1)
// app/components/UI/Card/hooks/useGetPriorityCardToken.tsx (1)
// app/components/hooks/useGetFormattedTokensPerChain.tsx (1)
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
