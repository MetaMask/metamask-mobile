import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { useAccounts } from '../../../hooks/useAccounts';
import { RootState } from '../../../../reducers';
import { useFetchAccountNotifications } from '../../../../util/notifications/hooks/useSwitchNotifications';

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
    accountsBeingUpdated.includes(address.toLowerCase());

  const isAccountEnabled = (address: string) =>
    data?.[address.toLowerCase()] ?? false;

  return {
    isAnyAccountLoading,
    refetchAccountSettings,
    isAccountLoading,
    isAccountEnabled,
  };
}

export function useAccountProps() {
  const { accounts } = useAccounts();
  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const accountAddresses = useMemo(
    () => accounts.map((a) => a.address),
    [accounts],
  );

  return {
    accounts,
    accountAvatarType,
    accountAddresses,
  };
}
