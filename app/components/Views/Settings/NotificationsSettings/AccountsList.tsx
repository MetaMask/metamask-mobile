import React from 'react';
import { FlatList, View } from 'react-native';
import {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';
import NotificationOptionToggle from './NotificationOptionToggle';
import { NotificationsToggleTypes } from './NotificationsSettings.constants';

export const ACCOUNT_LIST_ITEM_TEST_ID = (address: string) =>
  `${address}:account_list_item`;

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
            type={NotificationsToggleTypes.ACCOUNT}
            icon={accountAvatarType}
            title={item.name}
            address={item.address}
            disabledSwitch={isAnyAccountLoading}
            isLoading={isAccountLoading(item.address)}
            isEnabled={isAccountEnabled(item.address)}
            refetchNotificationAccounts={refetchAccountSettings}
            testID={ACCOUNT_LIST_ITEM_TEST_ID(item.address)}
          />
        )}
      />
    </View>
  );
};
