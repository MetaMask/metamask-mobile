import { createSelector } from 'reselect';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { RootState } from '../reducers';
import {
  selectSourceToken,
  selectDestToken,
} from '../core/redux/slices/bridge';
import { selectInternalAccountsByScope } from '../selectors/accountsController';
import type { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';

/**
 * Gets the wallet address for a given source token by finding the selected account
 * that matches the token's chain scope
 */
export const selectSourceWalletAddress = createSelector(
  [(state: RootState) => state, selectSourceToken],
  (state, sourceToken) => {
    if (!sourceToken) return undefined;

    const chainId = formatChainIdToCaip(sourceToken.chainId);
    const internalAccount =
      selectSelectedInternalAccountByScope(state)(chainId);

    return internalAccount ? internalAccount.address : undefined;
  },
);

/**
 * Returns a Set of InternalAccount IDs that are valid as destination accounts
 * for the currently selected destination token. For EVM destinations, includes
 * both the specific EVM chain and the EVM wildcard scope (eip155:0).
 */
export const selectValidDestInternalAccountIds = createSelector(
  [(state: RootState) => state, selectDestToken],
  (state, destToken): Set<AccountId> => {
    if (!destToken) return new Set<AccountId>();

    const destScope = formatChainIdToCaip(destToken.chainId);
    const isEvm = destScope.startsWith('eip155:');

    const byDestScope = selectInternalAccountsByScope(state, destScope);
    const evmWildcard = isEvm
      ? selectInternalAccountsByScope(state, EthScope.Eoa)
      : [];

    return new Set<AccountId>(
      [...byDestScope, ...evmWildcard].map((a) => a.id),
    );
  },
);
