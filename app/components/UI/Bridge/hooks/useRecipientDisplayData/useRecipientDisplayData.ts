import { useSelector } from 'react-redux';
import { selectDestAddress } from '../../../../../core/redux/slices/bridge';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import {
  selectAccountToGroupMap,
  selectAccountToWalletMap,
  selectWalletsMap,
} from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts';
import { useMemo } from 'react';
import { areAddressesEqual } from '../../../../../util/address';

/**
 * Custom hook to retrieve display information for the bridge recipient account.
 *
 * This hook determines the appropriate display name, wallet name, and address for the
 * destination/recipient account in a bridge transaction. It handles both internal accounts
 * (accounts within the wallet) and external accounts (addresses not in the wallet).
 *
 * When multichain accounts state 2 is enabled, it uses account group names and wallet names
 * for better organization.
 */
export const useRecipientDisplayData = () => {
  const destAddress = useSelector(selectDestAddress);
  const internalAccounts = useSelector(selectInternalAccounts);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const accountToWalletMap = useSelector(selectAccountToWalletMap);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const walletsMap = useSelector(selectWalletsMap);

  return useMemo(() => {
    if (!destAddress) {
      return {
        destinationDisplayName: undefined,
        destinationWalletName: undefined,
        destinationAccountAddress: undefined,
      };
    }

    const internalAccount = internalAccounts.find((account) =>
      areAddressesEqual(account.address, destAddress),
    );

    if (!internalAccount) {
      return {
        destinationDisplayName: undefined,
        destinationWalletName: undefined,
        destinationAccountAddress: destAddress,
      };
    }

    let displayName = internalAccount.metadata.name;
    let walletName: string | undefined;

    // Use account group name if available, otherwise use account name
    if (isMultichainAccountsState2Enabled) {
      const accountGroup = accountToGroupMap[internalAccount.id];
      displayName =
        accountGroup?.metadata.name || internalAccount.metadata.name;

      if (walletsMap) {
        const walletId = accountToWalletMap[internalAccount.id];
        if (walletId && walletsMap[walletId]) {
          walletName = walletsMap[walletId].metadata.name;
        }
      }
    }

    return {
      destinationDisplayName: displayName,
      destinationWalletName: walletName,
      destinationAccountAddress: internalAccount.address,
    };
  }, [
    destAddress,
    internalAccounts,
    accountToGroupMap,
    isMultichainAccountsState2Enabled,
    accountToWalletMap,
    walletsMap,
  ]);
};
