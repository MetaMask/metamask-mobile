import { AccountsControllerState } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectFlattenedKeyringAccounts } from './keyringController';

/**
 *
 * @param state - Root redux state
 * @returns - AccountsController state
 */
const selectAccountsControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountsController;

/**
 * A memoized selector that returns internal accounts from the AccountsController, sorted by the order of KeyringController's keyring accounts
 */
export const selectInternalAccounts = createDeepEqualSelector(
  selectAccountsControllerState,
  selectFlattenedKeyringAccounts,
  (accountControllerState, orderedKeyringAccounts) => {
    const keyringAccountsMap = new Map(
      orderedKeyringAccounts.map((account, index) => [
        account.toLowerCase(),
        index,
      ]),
    );
    const sortedAccounts = Object.values(
      accountControllerState.internalAccounts.accounts,
    ).sort(
      (a, b) =>
        (keyringAccountsMap.get(a.address.toLowerCase()) || 0) -
        (keyringAccountsMap.get(b.address.toLowerCase()) || 0),
    );
    return sortedAccounts;
  },
);

/**
 * A memoized selector that returns the selected internal account from the AccountsController
 */
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

/**
 * A memoized selector that returns the selected internal account address in checksum format
 */
export const selectSelectedInternalAccountChecksummedAddress = createSelector(
  selectSelectedInternalAccount,
  (account) => {
    const selectedAddress = account?.address;

    if (!selectedAddress || typeof selectedAddress !== 'string') {
      return undefined;
    }

    try {
      return toChecksumHexAddress(selectedAddress);
    } catch (error) {
      captureException(error);
      return undefined;
    }
  },
);