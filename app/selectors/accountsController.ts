import { AccountsControllerState } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

const selectAccountsControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountsController;

export const selectInternalAccounts = createDeepEqualSelector(
  selectAccountsControllerState,
  (accountControllerState) =>
    Object.values(accountControllerState.internalAccounts.accounts),
);

export const selectSelectedInternalAccount = createDeepEqualSelector(
  selectAccountsControllerState,
  (accountsControllerState: AccountsControllerState) => {
    const accountId = accountsControllerState.internalAccounts.selectedAccount;
    const account =
      accountsControllerState.internalAccounts.accounts[accountId];
    if (!account) {
      const err = new Error(
        `selectSelectedInternalAccount: Account with ID ${accountId} not found.`,
      );
      captureException(err);
      return undefined;
    }
    return account;
  },
);

export const selectSelectedInternalAccountChecksummedAddress = createSelector(
  selectSelectedInternalAccount,
  (account) => {
    const selectedAddress = account?.address;
    return selectedAddress ? toChecksumHexAddress(selectedAddress) : undefined;
  },
);
