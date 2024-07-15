import { AccountsControllerState } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectFlattenedKeyringAccounts } from './keyringController';
import { hexStringToUint8Array } from '../util/hexUtils';

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
    console.log('Input to toChecksumHexAddress:', selectedAddress);
    console.log('Type of input:', typeof selectedAddress);

    if (!selectedAddress || typeof selectedAddress !== 'string') {
      console.log('Invalid or undefined address');
      return undefined;
    }

    try {
      const addressUint8Array = hexStringToUint8Array(selectedAddress);
      const result = toChecksumHexAddress(addressUint8Array);
      console.log('Output from toChecksumHexAddress:', result);
      return result;
    } catch (error) {
      console.error('Error converting address to checksum format:', error);
      captureException(error);
      return undefined;
    }
  },
);