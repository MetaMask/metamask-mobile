import React, { useEffect } from 'react';
import { FlatList, View } from 'react-native';
import NotificationOptionToggle from './NotificationOptionToggle';
import { Account } from '../../../../components/hooks/useAccounts/useAccounts.types';
import { NotificationsToggleTypes } from './NotificationsSettings.constants';
import { NotificationsAccountsState } from '../../../../core/redux/slices/notifications';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

export const AccountsList = ({
  accounts,
  accountAvatarType,
  accountSettingsData,
  updateAndfetchAccountSettings,
  isUpdatingMetamaskNotificationsAccount,
}: {
  accounts: Account[];
  accountAvatarType: AvatarAccountType;
  accountSettingsData: NotificationsAccountsState;
  updateAndfetchAccountSettings: () => Promise<Record<string, boolean> | undefined>;
  isUpdatingMetamaskNotificationsAccount: string[];
}) => {

  useEffect(() => {
    const fetchInitialData = async () => {
      await updateAndfetchAccountSettings();
    };
    fetchInitialData();
  }, [updateAndfetchAccountSettings]);

  return (
    <View>
      <FlatList
      data={accounts}
      keyExtractor={(item) => `address-${item.address}`}
      renderItem={({ item }) => (
        <NotificationOptionToggle
          type={NotificationsToggleTypes.ACCOUNT}
          icon={accountAvatarType}
          key={item.address}
          title={item.name}
          address={item.address}
          disabledSwitch={isUpdatingMetamaskNotificationsAccount.length > 0}
          isLoading={isUpdatingMetamaskNotificationsAccount.includes(
            item.address.toLowerCase(),
          )}
          isEnabled={accountSettingsData?.[item.address.toLowerCase()]}
          updateAndfetchAccountSettings={updateAndfetchAccountSettings}
          />
    )}
  />
  </View>
  );
};
