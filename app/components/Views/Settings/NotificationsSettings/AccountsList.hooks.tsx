import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAccounts } from '../../../hooks/useAccounts';
import { useFetchAccountNotifications } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { getValidNotificationAccounts } from '../../../../selectors/notifications';
import {
  areAddressesEqual,
  toFormattedAddress,
} from '../../../../util/address';
import { selectAvatarAccountType } from '../../../../selectors/settings';

export function useNotificationAccountListProps(addresses: string[]) {
  const { update, initialLoading, accountsBeingUpdated, data } =
    useFetchAccountNotifications(addresses);

  // Loading is determined on initial fetch or if any account is being updated
  const updatingAccounts = accountsBeingUpdated.length > 0;
  const isAnyAccountLoading = initialLoading || updatingAccounts;

  const refetchAccountSettings = useCallback(async () => {
    await update(addresses);
  }, [addresses, update]);

  const isAccountLoading = (address: string) =>
    accountsBeingUpdated.some(
      (addr) => toFormattedAddress(addr) === toFormattedAddress(address),
    );

  const isAccountEnabled = (address: string) =>
    data?.[toFormattedAddress(address)] ??
    data?.[address.toLowerCase()] ?? // fallback to lowercase address lookup
    false;

  return {
    isAnyAccountLoading,
    refetchAccountSettings,
    isAccountLoading,
    isAccountEnabled,
  };
}

export function useAccountProps() {
  const accountAddresses = useSelector(getValidNotificationAccounts);
  const { accounts: allAccounts } = useAccounts();
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const accounts = useMemo(
    () =>
      accountAddresses
        .map((addr) => {
          const account = allAccounts.find((a) =>
            areAddressesEqual(a.address, addr),
          );
          return account;
        })
        .filter(<T,>(val: T | undefined): val is T => Boolean(val)),
    [accountAddresses, allAccounts],
  );

  return {
    accounts,
    accountAvatarType,
    accountAddresses,
  };
}
