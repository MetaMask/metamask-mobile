import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectFlattenedKeyringAccounts } from './keyringController';
import { EthMethod, InternalAccount } from '@metamask/keyring-api';
import {
  getFormattedAddressFromInternalAccount,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  isBtcAccount,
  isBtcMainnetAddress,
  isBtcTestnetAddress,
  ///: END:ONLY_INCLUDE_IF
} from '../core/Multichain/utils';

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
  (accountControllerState, orderedKeyringAccounts): InternalAccount[] => {
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
      throw err;
    }
    return account;
  },
);

/**
 * A memoized selector that returns the selected internal account address in checksum format
 */
export const selectSelectedInternalAccountFormattedAddress = createSelector(
  selectSelectedInternalAccount,
  (account) =>
    account?.address
      ? getFormattedAddressFromInternalAccount(account)
      : undefined,
);

/**
 * A memoized selector that returns the selected internal account address
 */
export const selectSelectedInternalAccountAddress = createSelector(
  selectSelectedInternalAccount,
  (account) => {
    const selectedAddress = account?.address;
    return selectedAddress || undefined;
  },
);

/**
 * A memoized selector that returns whether the selected internal account can sign transactions
 */
export const selectCanSignTransactions = createSelector(
  selectSelectedInternalAccount,
  (selectedAccount) =>
    selectedAccount?.methods?.includes(EthMethod.SignTransaction) ?? false,
);

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/**
 * A selector that returns whether the user has already created a Bitcoin mainnet account
 */
export function hasCreatedBtcMainnetAccount(state: RootState): boolean {
  const accounts = selectInternalAccounts(state);
  return accounts.some(
    (account) => isBtcAccount(account) && isBtcMainnetAddress(account.address),
  );
}

/**
 * A selector that returns whether the user has already created a Bitcoin testnet account
 */
export function hasCreatedBtcTestnetAccount(state: RootState): boolean {
  const accounts = selectInternalAccounts(state);
  return accounts.some(
    (account) => isBtcAccount(account) && isBtcTestnetAddress(account.address),
  );
}
///: END:ONLY_INCLUDE_IF
