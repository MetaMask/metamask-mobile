import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';

import { selectMultichainWallets } from '../../../../../selectors/multichainAccounts/wallets';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';
import { useSendType } from './useSendType';
import {
  type AccountWalletObject,
  type AccountGroupObject,
} from '@metamask/account-tree-controller';
import { type InternalAccount } from '@metamask/keyring-internal-api';

export interface Wallet {
  name: string;
  id: string;
  accounts: Account[];
}

interface Account {
  accountGroupName: string;
  account: InternalAccount;
}

export const useWallets = (): (Wallet | null)[] => {
  const multichainWallets = useSelector(selectMultichainWallets);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const { isEvmSendType, isSolanaSendType } = useSendType();

  const isAccountCompatible = useMemo(
    () => (accountId: string) => {
      const account = internalAccountsById[accountId];
      if (!account) return false;

      if (isEvmSendType) {
        return isEvmAccountType(account.type);
      }
      if (isSolanaSendType) {
        return isSolanaAccount(account);
      }
      return false;
    },
    [internalAccountsById, isEvmSendType, isSolanaSendType],
  );

  const processAccountGroup = useMemo(
    () => (accountGroup: AccountGroupObject) => {
      const compatibleAccounts = accountGroup.accounts
        .filter(isAccountCompatible)
        .map((accountId: string) => internalAccountsById[accountId]);

      if (compatibleAccounts.length === 0) return null;

      return {
        accountGroupName: accountGroup.metadata.name,
        // We expect a single account in the account group as we already filtered out the incompatible accounts by blockchain type
        // There might be some edge cases for BTC as there are two accounts in the account group
        account: compatibleAccounts[0],
      };
    },
    [isAccountCompatible, internalAccountsById],
  );

  const processWallet = useMemo(
    () => (wallet: AccountWalletObject) => {
      const accountGroups: AccountGroupObject[] = Object.values(wallet.groups);
      const accounts = accountGroups
        .map(processAccountGroup)
        .filter((account): account is Account => account !== null);

      if (accounts.length === 0) return null;

      return {
        name: wallet.metadata.name,
        id: wallet.id,
        accounts,
      };
    },
    [processAccountGroup],
  );

  const recipients = useMemo(
    () => multichainWallets.map(processWallet),
    [multichainWallets, processWallet],
  );

  return recipients;
};
