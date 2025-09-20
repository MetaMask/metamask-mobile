import { createSelector } from 'reselect';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { RootState } from '../reducers';
import { selectMultichainAccountsState2Enabled } from './featureFlagController/multichainAccounts';
import {
  selectSelectedInternalAccountAddress,
  selectInternalAccountsByScope,
} from './accountsController';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import type { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';

/**
 * Returns a Set of InternalAccount IDs that are valid for the selected ramp asset.
 * For EVM assets, includes both the specific EVM chain and the EVM wildcard scope (eip155:0).
 */
export const selectValidRampInternalAccountIds = createSelector(
  [
    (state: RootState) => state,
    (_state: RootState, asset: CryptoCurrency | null) => asset,
  ],
  (state, asset): Set<AccountId> => {
    if (!asset) return new Set<AccountId>();

    const assetScope = formatChainIdToCaip(asset.network?.chainId);
    const isEvm = assetScope.startsWith('eip155:');

    const byAssetScope = selectInternalAccountsByScope(state, assetScope);
    const evmWildcard = isEvm
      ? selectInternalAccountsByScope(state, EthScope.Eoa)
      : [];

    return new Set<AccountId>(
      [...byAssetScope, ...evmWildcard].map((a) => a.id),
    );
  },
);

/**
 * Gets the wallet address for a given ramp asset by finding the selected account
 * that matches the asset's chain scope.
 */
export const selectRampWalletAddress = createSelector(
  [
    (state: RootState) => state,
    (_state: RootState, asset: CryptoCurrency | null) => asset,
    selectMultichainAccountsState2Enabled,
    selectSelectedInternalAccountAddress,
  ],
  (
    state,
    asset,
    isMultichainAccountsState2Enabled,
    selectedInternalAccountAddress,
  ) => {
    if (!asset) return selectedInternalAccountAddress;

    if (!isMultichainAccountsState2Enabled) {
      return selectedInternalAccountAddress;
    }

    const chainId = formatChainIdToCaip(asset.network?.chainId);
    const internalAccount =
      selectSelectedInternalAccountByScope(state)(chainId);

    return internalAccount
      ? internalAccount.address
      : selectedInternalAccountAddress;
  },
);
