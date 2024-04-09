import { createSelector } from 'reselect';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { RootState } from '../reducers';

const selectAccountsControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountsController;

const selectSelectedInternalAccount = createSelector(
  selectAccountsControllerState,
  (accountsControllerState: AccountsControllerState) => {
    const accountId = accountsControllerState.internalAccounts.selectedAccount;
    return accountsControllerState.internalAccounts.accounts[accountId];
  },
);

export default selectSelectedInternalAccount; 
