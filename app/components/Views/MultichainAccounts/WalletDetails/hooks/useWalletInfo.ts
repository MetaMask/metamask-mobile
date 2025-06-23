import { useMemo } from 'react';
import { AccountWallet } from '@metamask/account-tree-controller';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';
import { useHdKeyringsWithSnapAccounts } from '../../../../hooks/useHdKeyringsWithSnapAccounts';
import { areAddressesEqual } from '../../../../../util/address';

/**
 * Hook that provides comprehensive wallet information including accounts, keyring ID, and SRP index
 * @param wallet - The AccountWallet object
 * @returns Object containing accounts, keyringId, and srpIndex
 */
export const useWalletInfo = (wallet: AccountWallet) => {
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();

  return useMemo(() => {
    // Get accounts from the wallet (only call this once)
    const accounts = getInternalAccountsFromWallet(wallet);

    if (accounts.length === 0) {
      return {
        accounts,
        keyringId: null,
        srpIndex: null,
      };
    }

    // Find which HD keyring this wallet belongs to using the first account
    // This follows the same pattern as ExportCredentials.tsx
    const keyringIndex = hdKeyringsWithSnapAccounts.findIndex((keyring) =>
      keyring.accounts.find((address) =>
        areAddressesEqual(address, accounts[0].address),
      ),
    );

    if (keyringIndex === -1) {
      return {
        accounts,
        keyringId: null,
        srpIndex: null,
      };
    }

    const keyring = hdKeyringsWithSnapAccounts[keyringIndex];
    const keyringId = keyring.metadata.id;

    const srpIndex = keyringIndex + 1;

    return {
      accounts,
      keyringId,
      srpIndex,
    };
  }, [wallet, hdKeyringsWithSnapAccounts]);
};
