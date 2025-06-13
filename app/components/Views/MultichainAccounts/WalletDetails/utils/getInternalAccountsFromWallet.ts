import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountWallet } from '@metamask/account-tree-controller';
import { AccountId } from '@metamask/accounts-controller';
import Engine from '../../../../../core/Engine';

/**
 * Fetches internal accounts from the AccountsController based on the wallet's account IDs
 * @param wallet - The wallet containing account IDs to fetch
 * @returns Array of internal accounts
 */
export const getInternalAccountsFromWallet = (
  wallet: AccountWallet,
): InternalAccount[] => {
  const { AccountsController } = Engine.context;
  const { accounts } = AccountsController.state.internalAccounts;

  // Extract all account IDs from the wallet's groups
  const accountIds: AccountId[] = [];
  Object.values(wallet.groups).forEach((group) => {
    accountIds.push(...group.accounts);
  });

  // Fetch internal accounts for each account ID
  const internalAccounts = accountIds
    .map((accountId) => accounts[accountId])
    .filter((account): account is InternalAccount => account !== undefined);

  return internalAccounts;
};
