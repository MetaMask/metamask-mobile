import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';
import {
  type AccountWalletObject,
  type AccountGroupObject,
} from '@metamask/account-tree-controller';

import { selectMultichainWallets } from '../../../../../selectors/multichainAccounts/wallets';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';
import { type RecipientType } from '../../components/UI/recipient';
import { useSendType } from './useSendType';

export const useAccounts = (): RecipientType[] => {
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
        .filter((accountId: string) => isAccountCompatible(accountId))
        .map((accountId: string) => internalAccountsById[accountId]);

      if (compatibleAccounts.length === 0) return null;

      return {
        name: compatibleAccounts[0].metadata.name,
        // We expect a single account in the account group as we already filtered out the incompatible accounts by blockchain type
        // There might be some edge cases for BTC as there are two accounts in the account group
        address: compatibleAccounts[0].address,
        //Temporary fiat value
        fiatValue: '$1,000.00',
      };
    },
    [isAccountCompatible, internalAccountsById],
  );

  const processWallet = useMemo(
    () => (wallet: AccountWalletObject) => {
      const accountGroups: AccountGroupObject[] = Object.values(wallet.groups);
      const accounts = accountGroups
        .map(processAccountGroup)
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
