import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectFlattenedKeyringAccounts } from './keyringController';
import { BtcMethod, EthMethod, SolMethod } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  getFormattedAddressFromInternalAccount,
  isSolanaAccount,
  isBtcAccount,
  isBtcMainnetAddress,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
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
      return undefined;
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
    (selectedAccount?.methods?.includes(EthMethod.SignTransaction) ||
      selectedAccount?.methods?.includes(SolMethod.SignTransaction) ||
      selectedAccount?.methods?.includes(SolMethod.SignMessage) ||
      selectedAccount?.methods?.includes(SolMethod.SendAndConfirmTransaction) ||
      selectedAccount?.methods?.includes(SolMethod.SignAndSendTransaction) ||
      selectedAccount?.methods?.includes(BtcMethod.SendBitcoin)) ??
    false,
);

/**
 * A selector that returns whether the user has already created a Solana mainnet account
 */
export const selectHasCreatedSolanaMainnetAccount = createSelector(
  selectInternalAccounts,
  (accounts) => accounts.some((account) => isSolanaAccount(account)),
);

/**
 * A selector that returns whether the user has already created a Bitcoin mainnet account
 */
export const selectHasCreatedBtcMainnetAccount = createSelector(
  selectInternalAccounts,
  (accounts) =>
    accounts.some(
      (account) =>
        isBtcAccount(account) && isBtcMainnetAddress(account.address),
    ),
);

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)

/**
 * A selector that returns whether the user has already created a Bitcoin testnet account
 */
export function hasCreatedBtcTestnetAccount(state: RootState): boolean {
  const accounts = selectInternalAccounts(state);
  return accounts.some(
    (account) => isBtcAccount(account) && isBtcTestnetAddress(account.address),
  );
}

/**
 * A selector that returns the solana account address
 * @param state - Root redux state
 * @returns - The solana account address
 */
export const selectSolanaAccountAddress = createSelector(
  selectInternalAccounts,
  (accounts) => accounts.find((account) => isSolanaAccount(account))?.address,
);

export const selectSolanaAccount = createSelector(
  selectInternalAccounts,
  (accounts) => accounts.find((account) => isSolanaAccount(account)),
);

///: END:ONLY_INCLUDE_IF
