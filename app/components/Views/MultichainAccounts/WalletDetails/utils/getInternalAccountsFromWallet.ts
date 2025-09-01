import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import Engine from '../../../../../core/Engine';

/**
 * Fetches internal accounts from the AccountsController based on the wallet's account IDs
 * @param wallet - The wallet containing account IDs to fetch
 * @returns Array of internal accounts
 */
export const getInternalAccountsFromWallet = (
  wallet: AccountWalletObject,
): InternalAccount[] => {
  const { AccountsController } = Engine.context;
  const { accounts } = AccountsController.state.internalAccounts;
  return Object.values(wallet.groups)
    .flatMap((group) => group.accounts)
    .map((accountId) => accounts[accountId])
    .filter((account): account is InternalAccount => account !== undefined);
};
