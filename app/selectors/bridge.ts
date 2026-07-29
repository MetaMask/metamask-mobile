import { createSelector } from 'reselect';
import {
  formatChainIdToCaip,
  isNonEvmChainId,
  formatChainIdToHex,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { RootState } from '../reducers';
import {
  selectSourceToken,
  selectDestToken,
  selectBatchSellSourceTokens,
  selectIsSwap,
  selectIsGasIncludedSTXSendBundleSupported,
  selectIsGasIncluded7702Supported,
} from '../core/redux/slices/bridge';
import { selectInternalAccountsById } from '../selectors/accountsController';
import type { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';
import { KnownCaipNamespace } from '@metamask/utils';
import { getGaslessBridgeWith7702EnabledForChain } from './smartTransactionsController';
import { anyScopesMatch } from '../components/hooks/useAccountGroupsForPermissions/utils';

/**
 * Gets the wallet address for a given source token by finding the selected account
 * that matches the token's chain scope
 */
export const selectSourceWalletAddress = createSelector(
  [selectSourceToken, selectSelectedInternalAccountByScope],
  (sourceToken, getAccountByScope) => {
    if (!sourceToken) return undefined;

    const chainId = formatChainIdToCaip(sourceToken.chainId);
    return getAccountByScope(chainId)?.address;
  },
);

/**
 * Gets the wallet address for the first Batch Sell source token by finding the
 * selected account that matches the token's chain scope.
 */
export const selectBatchSellSourceWalletAddress = createSelector(
  [selectBatchSellSourceTokens, selectSelectedInternalAccountByScope],
  (sourceTokens, getAccountByScope) => {
    const [sourceToken] = sourceTokens;
    if (!sourceToken) return undefined;

    const chainId = formatChainIdToCaip(sourceToken.chainId);
    return getAccountByScope(chainId)?.address;
  },
);

/**
 * Returns a Set of InternalAccount IDs that are valid as destination accounts
 * for the currently selected destination token. For EVM destinations, includes
 * both the specific EVM chain and the EVM wildcard scope (eip155:0).
 */
export const selectValidDestInternalAccountIds = createSelector(
  [selectDestToken, selectInternalAccountsById],
  (destToken, internalAccountsById): Set<AccountId> => {
    if (!destToken) return new Set<AccountId>();

    const destScope = formatChainIdToCaip(destToken.chainId);
    const isEvm = destScope.startsWith(KnownCaipNamespace.Eip155);

    return new Set<AccountId>(
      Object.values(internalAccountsById)
        .filter(
          (account) =>
            anyScopesMatch(account.scopes, destScope) ||
            (isEvm && anyScopesMatch(account.scopes, EthScope.Eoa)),
        )
        .map((account) => account.id),
    );
  },
);

export const selectIsGasIncluded7702BridgeEnabled = (
  state: RootState,
): boolean => {
  const sourceToken = selectSourceToken(state);
  if (!sourceToken?.chainId || isNonEvmChainId(sourceToken.chainId))
    return false;

  const hexChainId = formatChainIdToHex(sourceToken.chainId);
  return getGaslessBridgeWith7702EnabledForChain(state, hexChainId);
};

/**
 * Selector that returns the gas included quote params for bridge and swap transactions.
 * Combines isSwap, STX/SendBundle support, and 7702 support to determine the correct
 * gas included parameters.
 */
export const selectGasIncludedQuoteParams = createSelector(
  [
    selectSourceToken,
    selectIsSwap,
    selectIsGasIncludedSTXSendBundleSupported,
    selectIsGasIncluded7702Supported,
    selectIsGasIncluded7702BridgeEnabled,
  ],
  (
    sourceToken,
    isSwap,
    gasIncludedSTXSendBundleSupport,
    gasIncluded7702Support,
    gasIncluded7702BridgeEnabled,
  ) => {
    // Enable gas-included swaps for solana
    if (sourceToken?.chainId && isSolanaChainId(sourceToken.chainId)) {
      return { gasIncluded: true, gasIncluded7702: false };
    }

    if (gasIncludedSTXSendBundleSupport) {
      return { gasIncluded: true, gasIncluded7702: false };
    }

    const gasIncludedWith7702Enabled =
      (Boolean(isSwap) || gasIncluded7702BridgeEnabled) &&
      gasIncluded7702Support;

    return {
      gasIncluded: gasIncludedWith7702Enabled,
      gasIncluded7702: gasIncludedWith7702Enabled,
    };
  },
);
