import { createSelector } from 'reselect';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { RootState } from '../reducers';
import { selectSourceToken } from '../core/redux/slices/bridge';

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
