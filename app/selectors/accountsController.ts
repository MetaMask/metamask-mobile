import {
  AccountId,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectFlattenedKeyringAccounts } from './keyringController';
import {
  BtcMethod,
  EthMethod,
  EthScope,
  SolMethod,
  isEvmAccountType,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  getFormattedAddressFromInternalAccount,
  isSolanaAccount,
} from '../core/Multichain/utils';
import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { areAddressesEqual, toFormattedAddress } from '../util/address';

export type InternalAccountWithCaipAccountId = InternalAccount & {
  caipAccountId: CaipAccountId;
};

/**
 *
 * @param state - Root redux state
 * @returns - AccountsController state
 */
export const selectAccountsControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountsController;

/**
 * A memoized selector that returns internal accounts from the AccountsController.
 */
export const selectInternalAccountsById = createDeepEqualSelector(
  selectAccountsControllerState,
  (accountControllerState): Record<AccountId, InternalAccount> =>
    accountControllerState.internalAccounts.accounts,
);

/**
 * A memoized selector that returns internal accounts from the AccountsController, sorted by the order of KeyringController's keyring accounts
 */
export const selectInternalAccounts = createDeepEqualSelector(
  selectAccountsControllerState,
  selectFlattenedKeyringAccounts,
  (accountControllerState, orderedKeyringAccounts): InternalAccount[] => {
    const keyringAccountsMap = new Map(
      orderedKeyringAccounts.map((account, index) => [
        toFormattedAddress(account),
        index,
      ]),
    );
    const sortedAccounts = Object.values(
      accountControllerState.internalAccounts.accounts,
    ).sort(
      (a, b) =>
        (keyringAccountsMap.get(toFormattedAddress(a.address)) || 0) -
        (keyringAccountsMap.get(toFormattedAddress(b.address)) || 0),
    );
    return sortedAccounts;
  },
);

export const selectInternalEvmAccounts = createSelector(
  selectInternalAccounts,
  (accounts) => accounts.filter((account) => isEvmAccountType(account.type)),
);

/**
 * A memoized selector that returns internal accounts from the AccountsController,
 * sorted by the order of KeyringController's keyring accounts,
 * with an additional caipAccountId property
 */
export const selectInternalAccountsWithCaipAccountId = createDeepEqualSelector(
  selectInternalAccounts,
  (accounts): InternalAccountWithCaipAccountId[] =>
    accounts.map((account) => {
      const { namespace, reference } = parseCaipChainId(account.scopes[0]);
      return {
        ...account,
        caipAccountId: `${namespace}:${reference}:${account.address}`,
      };
    }),
);

/**
 * A memoized selector that returns the selected internal account from the AccountsController
 */
export const selectSelectedInternalAccount = createDeepEqualSelector(
  selectAccountsControllerState,
  (
    accountsControllerState: AccountsControllerState,
  ): InternalAccount | undefined => {
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
 * A memoized selector that returns the selected internal account id
 */
export const selectSelectedInternalAccountId = createSelector(
  selectSelectedInternalAccount,
  (account): string | undefined => account?.id,
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
  (internalAccounts, address) =>
    internalAccounts.find((account) =>
      areAddressesEqual(account.address, address),
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
      selectedAccount?.methods?.includes(BtcMethod.SignPsbt)) ??
    false,
);

/**
 * A selector that returns whether the user has already created a Solana mainnet account
 */
export const selectHasCreatedSolanaMainnetAccount = createSelector(
  selectInternalAccounts,
  (accounts) => accounts.some((account) => isSolanaAccount(account)),
);

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)

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

/**
 * A memoized selector that returns all internal accounts that are valid for a given scope.
 *
 * For EVM scopes (eip155:*), this returns all accounts that have any EVM scope
 * (i.e., any scope that starts with 'eip155:'). For non-EVM scopes, this returns
 * all accounts that include the exact scope.
 */
export const selectInternalAccountsByScope = createDeepEqualSelector(
  [
    selectInternalAccountsById,
    (_state: RootState, scope: CaipChainId) => scope,
  ],
  (
    accountsMap: Record<AccountId, InternalAccount>,
    scope: CaipChainId,
  ): InternalAccount[] => {
    const accounts = Object.values(accountsMap);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return [];
    }

    // Parse the requested scope
    let namespace: string;
    let reference: string;
    try {
      const parsed = parseCaipChainId(scope);
      namespace = parsed.namespace;
      reference = parsed.reference;
    } catch {
      return [];
    }

    if (namespace === KnownCaipNamespace.Eip155) {
      // If requesting eip155:0 (wildcard), include any account that has any EVM scope
      if (reference === '0') {
        return accounts.filter(
          (account) =>
            Array.isArray(account.scopes) &&
            account.scopes.some((s) =>
              s.startsWith(`${KnownCaipNamespace.Eip155}:`),
            ),
        );
      }

      // For a specific EVM chain, include accounts that either:
      // - have the exact scope (e.g., eip155:1), or
      // - have the wildcard scope (eip155:0)
      return accounts.filter(
        (account) =>
          Array.isArray(account.scopes) &&
          (account.scopes.includes(scope) ||
            account.scopes.includes(EthScope.Eoa)),
      );
    }

    // Non-EVM: exact scope match only
    return accounts.filter(
      (account) =>
        Array.isArray(account.scopes) && account.scopes.includes(scope),
    );
  },
);
