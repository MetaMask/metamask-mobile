import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useFetchAccountNotifications } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { getValidNotificationAccounts } from '../../../../selectors/notifications';
import { toFormattedAddress } from '../../../../util/address';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';
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

export function useNotificationWalletAccountGroups() {
  const accountGroupsByWallet = useSelector(selectAccountGroupsByWallet);
  const accountsMap = useSelector(selectInternalAccountsById);

  return useMemo(
    () =>
      accountGroupsByWallet
        .map((walletGroup) => ({
          ...walletGroup,
          data: walletGroup.data.filter((accountGroup) =>
            accountGroup.accounts.some(
              (accountId) =>
                Boolean(accountsMap?.[accountId]?.address) &&
                isEvmAccountType(accountsMap[accountId].type),
            ),
          ),
        }))
        .filter((walletGroup) => walletGroup.data.length > 0),
    [accountGroupsByWallet, accountsMap],
  );
}

export function useAccountProps() {
  const accountWalletGroups = useNotificationWalletAccountGroups();
  const accountAvatarType = useSelector(selectAvatarAccountType);

  return {
    accountWalletGroups,
    accountAvatarType,
  };
}
