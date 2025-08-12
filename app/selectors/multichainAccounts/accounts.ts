import { InternalAccount } from '@metamask/keyring-internal-api';
import { createDeepEqualSelector } from '../util';
import { selectAccountTreeControllerState } from './accountTreeController';
import {
  AccountTreeControllerState,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import {
  AccountGroupId,
  AccountWalletId,
  selectOne,
} from '@metamask/account-api';
import { CaipChainId } from '@metamask/utils';
import { selectInternalAccountsById } from '../accountsController';
import { AccountId } from '@metamask/accounts-controller';

/**
 * Extracts the wallet ID from an account group ID.
 *
 * Account group IDs follow the format: "{walletId}/{groupName}"
 * For example: "keyring:wallet1/1" -> "keyring:wallet1"
 *
 * @param accountGroupId - The account group ID to extract the wallet ID from
 * @returns The wallet ID portion of the account group ID
 * @throws {Error} If the account group ID is invalid (no wallet ID before '/')
 *
 * @example
 * ```typescript
 * const walletId = getWalletIdFromAccountGroup('keyring:wallet1/ethereum');
 * // Returns: 'keyring:wallet1'
 * ```
 */
export const getWalletIdFromAccountGroup = (
  accountGroupId: AccountGroupId,
): AccountWalletId => {
  const walletId = accountGroupId.split('/')[0];

  if (!walletId) {
    throw new Error('Invalid account group ID');
  }

  return walletId as AccountWalletId;
};

/**
 * Helper function to find an internal account by scope within a specific account group.
 *
 * This function performs the core logic for finding accounts that match a given scope
 * within a specific account group. It handles both EVM and non-EVM scopes:
 * - For EVM scopes (eip155:*): Matches any account with any EVM scope
 * - For non-EVM scopes: Requires exact scope match
 *
 * @param accountTreeState - The AccountTreeController state containing wallet/group data
 * @param internalAccountsMap - Map of account IDs to internal account objects
 * @param accountGroupId - The account group ID to search within
 * @param scope - The CAIP chain ID scope to match against account scopes
 * @returns The first matching internal account, or undefined if none found
 *
 * @example
 * ```typescript
 * const account = findInternalAccountByScope(
 *   accountTreeState,
 *   accountsMap,
 *   'keyring:wallet1/ethereum',
 *   'eip155:1'
 * );
 * ```
 */
const findInternalAccountByScope = (
  accountTreeState: AccountTreeControllerState,
  internalAccountsMap: Record<AccountId, InternalAccount>,
  accountGroupId: string,
  scope: CaipChainId,
): InternalAccount | undefined => {
  if (!accountTreeState?.accountTree?.wallets || !accountGroupId) {
    return undefined;
  }

  const walletId = getWalletIdFromAccountGroup(
    accountGroupId as AccountGroupId,
  );

  const wallet: AccountWalletObject | undefined =
    accountTreeState.accountTree.wallets[walletId];
  if (!wallet) {
    return undefined;
  }

  const accountGroup =
    wallet.groups[accountGroupId as keyof typeof wallet.groups];

  if (!accountGroup) {
    return undefined;
  }

  const accountGroupInternalAccounts = accountGroup.accounts
    .map((accountId: AccountId) => internalAccountsMap[accountId])
    // filter out undefined accounts. The accounts should never be undefined
    // because the accounts in the accountGroup comes from the accounts controller
    .filter((account): account is InternalAccount => Boolean(account));

  // Handle EVM scope matching: for EVM scopes (eip155:*), match any account with any EVM scope
  // For non-EVM scopes, require exact scope match
  const isEvmScope = scope.startsWith('eip155:');

  if (isEvmScope) {
    // Find any account that has any EVM scope
    return accountGroupInternalAccounts.find((account) =>
      account.scopes.some((accountScope) => accountScope.startsWith('eip155:')),
    );
  }
  // For non-EVM scopes, use exact matching
  return selectOne(accountGroupInternalAccounts, {
    scopes: [scope],
  });
};

/**
 * Selector to get an internal account by scope from the currently selected account group.
 *
 * This selector finds an account that matches the given scope within the currently
 * selected account group in the AccountTreeController. If no account group is selected
 * or no matching account is found, returns undefined.
 *
 * @param state - The Redux root state
 * @returns A function that takes a scope and returns the matching internal account or undefined
 *
 * @example
 * ```typescript
 * const selector = selectSelectedInternalAccountByScope(state);
 * const evmAccount = selector('eip155:1'); // Get EVM account from selected group
 * const solanaAccount = selector('solana:mainnet'); // Get Solana account from selected group
 * ```
 */
export const selectSelectedInternalAccountByScope = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectInternalAccountsById],
  (
      accountTreeState: AccountTreeControllerState,
      internalAccountsMap: Record<AccountId, InternalAccount>,
    ) =>
    (scope: CaipChainId): InternalAccount | undefined => {
      if (!accountTreeState?.accountTree?.selectedAccountGroup) {
        return undefined;
      }

      return findInternalAccountByScope(
        accountTreeState,
        internalAccountsMap,
        accountTreeState.accountTree.selectedAccountGroup,
        scope,
      );
    },
);

/**
 * Selector to get an internal account by scope from a specific account group.
 *
 * This selector allows you to find an account that matches a given scope within
 * any specific account group by providing both the scope and account group ID.
 * This is useful when you need to find accounts in groups other than the currently
 * selected one.
 *
 * @param state - The Redux root state
 * @returns A function that takes a scope and account group ID, returns the matching internal account or undefined
 *
 * @example
 * ```typescript
 * const selector = selectInternalAccountByAccountGroupAndScope(state);
 * const evmAccount = selector('eip155:1', 'keyring:wallet1/ethereum');
 * const solanaAccount = selector('solana:mainnet', 'entropy:wallet2/solana');
 * ```
 */
export const selectInternalAccountByAccountGroupAndScope =
  createDeepEqualSelector(
    [selectAccountTreeControllerState, selectInternalAccountsById],
    (
        accountTreeState: AccountTreeControllerState,
        internalAccountsMap: Record<AccountId, InternalAccount>,
      ) =>
      (
        scope: CaipChainId,
        accountGroupId: string,
      ): InternalAccount | undefined =>
        findInternalAccountByScope(
          accountTreeState,
          internalAccountsMap,
          accountGroupId,
          scope,
        ),
  );
