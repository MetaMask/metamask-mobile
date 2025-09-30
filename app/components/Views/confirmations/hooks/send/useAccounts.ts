import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';
import {
  type AccountWalletObject,
  type AccountGroupObject,
} from '@metamask/account-tree-controller';

import { selectWallets } from '../../../../../selectors/multichainAccounts/wallets';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';
import { type RecipientType } from '../../components/UI/recipient';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

export const useAccounts = (): RecipientType[] => {
  const multichainWallets = useSelector(selectWallets);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const { from } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();

  const isAccountCompatible = useMemo(
    () => (accountId: string) => {
      const account = internalAccountsById[accountId];
      if (!account) return false;

      // We don't want to show the selected account in the accounts list
      if (from === account.address) {
        return false;
      }

      if (isEvmSendType) {
        return isEvmAccountType(account.type);
      }
      if (isSolanaSendType) {
        return isSolanaAccount(account);
      }
      return false;
    },
    [internalAccountsById, isEvmSendType, isSolanaSendType, from],
  );

  const processAccountGroup = useMemo(
    () => (accountGroup: AccountGroupObject, wallet: AccountWalletObject) => {
      const account = accountGroup.accounts
        .filter((accountId: string) => isAccountCompatible(accountId))
        .map((accountId: string) => internalAccountsById[accountId])[0];

      if (!account) return null;

      return {
        accountGroupName: accountGroup.metadata.name,
        accountName: account.metadata.name,
        address: account.address,
        walletName: wallet.metadata.name,
      };
    },
    [isAccountCompatible, internalAccountsById],
  );

  const processWallet = useMemo(
    () => (wallet: AccountWalletObject) => {
      const accountGroups: AccountGroupObject[] = Object.values(wallet.groups);
      const accounts = accountGroups
        .map((accountGroup) => processAccountGroup(accountGroup, wallet))
        .filter(
          (recipient): recipient is NonNullable<typeof recipient> =>
            recipient !== null,
        );

      if (accounts.length === 0) return null;

      return {
        name: wallet.metadata.name,
        id: wallet.id,
        accounts,
      };
    },
    [processAccountGroup],
  );

  const accounts = useMemo(
    () =>
      multichainWallets
        .map(processWallet)
        .flatMap((wallet) => wallet?.accounts ?? []),
    [multichainWallets, processWallet],
  );

  return accounts;
};
