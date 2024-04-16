import { createSelector } from 'reselect';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { RootState } from '../reducers';
import { toChecksumAddress } from 'ethereumjs-util';

const selectAccountsControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountsController;

export const selectSelectedInternalAccount = createSelector(
  selectAccountsControllerState,
  (accountsControllerState: AccountsControllerState) => {
    const accountId = accountsControllerState.internalAccounts.selectedAccount;
    return accountsControllerState.internalAccounts.accounts[accountId];
  },
);

export const selectSelectedInternalAccountAddressAsChecksum = createSelector(
  selectAccountsControllerState,
  (accountsControllerState: AccountsControllerState) => {
    const accountId = accountsControllerState.internalAccounts.selectedAccount;
    const selectedAddress =
      accountsControllerState.internalAccounts.accounts[accountId].address;
    return toChecksumAddress(selectedAddress);
  },
);
