import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AccountWallet } from '@metamask/account-tree-controller';
import { getInternalAccountsFromWallet } from '../utils/getInternalAccountsFromWallet';
import { useHdKeyringsWithSnapAccounts } from '../../../../hooks/useHdKeyringsWithSnapAccounts';
import { areAddressesEqual } from '../../../../../util/address';
import { selectSeedphraseBackedUp } from '../../../../../reducers/user/selectors';

/**
 * Hook that provides comprehensive wallet information including accounts, keyring ID, SRP index, and backup status
 * @param wallet - The AccountWallet object
 * @returns Object containing accounts, keyringId, srpIndex, and isSRPBackedUp
 */
export const useWalletInfo = (wallet: AccountWallet) => {
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();
  const isSRPBackedUp = useSelector(selectSeedphraseBackedUp);

  const accounts = useMemo(
    () => getInternalAccountsFromWallet(wallet),
    [wallet],
  );

  return useMemo(() => {
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
      isSRPBackedUp,
    };
  }, [accounts, hdKeyringsWithSnapAccounts, isSRPBackedUp]);
};
