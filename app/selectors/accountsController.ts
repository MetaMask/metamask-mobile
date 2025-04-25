import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectFlattenedKeyringAccounts } from './keyringController';
import {
  BtcMethod,
  EthMethod,
  SolMethod,
  isEvmAccountType,
} from '@metamask/keyring-api';
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
import { isEqualCaseInsensitive } from '@metamask/controller-utils';

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
 * A memoized selector that returns the internal accounts sorted by the last selected timestamp
 */
export const selectOrderedInternalAccountsByLastSelected = createSelector(
  selectAccountsControllerState,
  (accountsControllerState) => {
    const accounts = accountsControllerState.internalAccounts.accounts;

    // Convert accounts object to array and sort by lastSelected timestamp
    return Object.values(accounts).sort((a, b) => {
      const aLastSelected = a.metadata?.lastSelected || 0;
      const bLastSelected = b.metadata?.lastSelected || 0;

      // Sort in descending order (most recent first)
      return bLastSelected - aLastSelected;
    });
  },
);

export const getMemoizedInternalAccountByAddress = createDeepEqualSelector(
  [selectInternalAccounts, (_state, address) => address],
  (internalAccounts, address) => internalAccounts.find((account) =>
      isEqualCaseInsensitive(account.address, address),
    ),
);

/**
 * A memoized selector that returns the last selected EVM account
 */
export const selectLastSelectedEvmAccount = createSelector(
  selectOrderedInternalAccountsByLastSelected,
  (accounts) => accounts.find((account) => account.type === 'eip155:eoa'),
);

/**
 * A memoized selector that returns the last selected Solana account
 */
export const selectLastSelectedSolanaAccount = createSelector(
  selectOrderedInternalAccountsByLastSelected,
  (accounts) =>
    accounts.find((account) => account.type === 'solana:data-account'),
);

/**
 * A memoized selector that returns the selected internal account address in checksum format
 */
export const selectSelectedInternalAccountFormattedAddress =
  createDeepEqualSelector(selectSelectedInternalAccount, (account) =>
    account?.address
      ? getFormattedAddressFromInternalAccount(account)
      : undefined,
  );

/**
 * A memoized selector that returns the previously selected EVM account
 */
export const selectPreviouslySelectedEvmAccount = createDeepEqualSelector(
  selectInternalAccounts,
  (accounts) => {
    const evmAccounts = accounts.filter((account) =>
      isEvmAccountType(account.type),
    );

    if (evmAccounts.length === 0) {
      return undefined;
    }

    const previouslySelectedEvmAccount = [...evmAccounts].sort((a, b) => {
      const aTimestamp = a?.metadata?.lastSelected || 0;
      const bTimestamp = b?.metadata?.lastSelected || 0;
      return bTimestamp - aTimestamp;
    })[0];

    return previouslySelectedEvmAccount;
  },
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
