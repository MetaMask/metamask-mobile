import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useFetchAccountNotifications } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { getValidNotificationAccounts } from '../../../../selectors/notifications';
import { toFormattedAddress } from '../../../../util/address';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountWalletType } from '@metamask/account-api';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { isEvmAccountType } from '@metamask/keyring-api';

export function useNotificationAccountListProps() {
  const accountAddresses = useSelector(getValidNotificationAccounts);
  const accountsMap = useSelector(selectInternalAccountsById);
  const { update, initialLoading, accountsBeingUpdated, data } =
    useFetchAccountNotifications(accountAddresses);

  const isAnyAccountLoading = initialLoading || accountsBeingUpdated.length > 0;

  const refetchAccountSettings = useCallback(async () => {
    await update(accountAddresses);
  }, [accountAddresses, update]);

  // Helper to get addresses from account IDs
  const getEvmAddressesFromAccountIds = useCallback(
    (accountIds: string[]) =>
      accountIds
        .filter(
          (id) =>
            Boolean(accountsMap?.[id]?.address) &&
            isEvmAccountType(accountsMap[id].type),
        )
        .map((id) => accountsMap[id].address),
    [accountsMap],
  );

  // Helper to normalize address lookup in data
  const isAddressEnabled = useCallback(
    (address: string) =>
      data?.[toFormattedAddress(address)] ??
      data?.[address.toLowerCase()] ??
      false,
    [data],
  );

  const isAccountLoading = useCallback(
    (accountIds: string[]) => {
      const addresses = getEvmAddressesFromAccountIds(accountIds);
      return accountsBeingUpdated.some((updatingAddr) =>
        addresses.some(
          (addr) =>
            toFormattedAddress(updatingAddr) === toFormattedAddress(addr),
        ),
      );
    },
    [accountsBeingUpdated, getEvmAddressesFromAccountIds],
  );

  const isAccountEnabled = useCallback(
    (accountIds: string[]) => {
      const addresses = getEvmAddressesFromAccountIds(accountIds);
      return addresses.some(isAddressEnabled);
    },
    [getEvmAddressesFromAccountIds, isAddressEnabled],
  );

  const getEvmAddress = useCallback(
    (accountIds: string[]) => {
      const addresses = getEvmAddressesFromAccountIds(accountIds);
      const address = addresses.at(0); // get first evm address - keyring only contains 1 EVM address
      return address && toFormattedAddress(address);
    },
    [getEvmAddressesFromAccountIds],
  );

  return {
    isAnyAccountLoading,
    refetchAccountSettings,
    isAccountLoading,
    isAccountEnabled,
    getEvmAddress,
  };
}

export function useFirstHDWalletAccounts() {
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);

  // TODO - do we have a reliable way of receiving the first HD wallet?
  // Notifications only support the first HD wallet (due to backend limitations)
  // This limitation will most likely be removed in near future
  const firstHDWalletGroup = accountGroupsByWallet.find(
    (w) => w.wallet.type === AccountWalletType.Entropy,
  );
  return firstHDWalletGroup;
}

export function useAccountProps() {
  const firstHDWalletGroups = useFirstHDWalletAccounts();
  const accountAvatarType = useSelector(selectAvatarAccountType);

  return {
    firstHDWalletGroups,
    accountAvatarType,
  };
}
