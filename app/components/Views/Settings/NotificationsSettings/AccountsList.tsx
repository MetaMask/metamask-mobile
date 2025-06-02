import React from 'react';
import { FlatList, View } from 'react-native';
import {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';
import NotificationOptionToggle from './NotificationOptionToggle';
import { NotificationSettingsViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationSettingsView.selectors';

export const AccountsList = () => {
  const { accounts, accountAddresses, accountAvatarType } = useAccountProps();
  const {
    isAnyAccountLoading,
    isAccountLoading,
    isAccountEnabled,
    refetchAccountSettings,
  } = useNotificationAccountListProps(accountAddresses);

  return (
    <View>
      <FlatList
        data={accounts}
        keyExtractor={(item) => `address-${item.address}`}
        renderItem={({ item }) => (
          <NotificationOptionToggle
            key={item.address}
            icon={accountAvatarType}
            title={item.name}
            address={item.address}
            disabledSwitch={isAnyAccountLoading}
            isLoading={isAccountLoading(item.address)}
            isEnabled={isAccountEnabled(item.address)}
            refetchNotificationAccounts={refetchAccountSettings}
            testID={NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
              item.address.toLowerCase(),
            )}
          />
        )}
      />
    </View>
  );
};
