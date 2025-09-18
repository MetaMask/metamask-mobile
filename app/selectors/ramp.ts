import { createSelector } from 'reselect';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { RootState } from '../reducers';
import { selectMultichainAccountsState2Enabled } from './featureFlagController/multichainAccounts';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';

// TODO: This code is mostly the same as Bridge's selectSourceWalletAddress
// revise if a better pattern can be found

/**
 * Gets the wallet address for a given ramp asset by finding the selected account
 * that matches the asset's chain scope
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
