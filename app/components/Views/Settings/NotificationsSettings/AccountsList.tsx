import React from 'react';
import { FlatList, View } from 'react-native';
import {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';
import NotificationOptionToggle from './NotificationOptionToggle';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import AccountListHeader from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListHeader';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';

export const AccountsList = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const { accountAvatarType, firstHDWalletGroups } = useAccountProps();
  const {
    isAnyAccountLoading,
    isAccountLoading,
    isAccountEnabled,
    refetchAccountSettings,
    getEvmAddress,
  } = useNotificationAccountListProps();

  if (!firstHDWalletGroups) {
    return null;
  }

  return (
    <View>
      <AccountListHeader
        title={firstHDWalletGroups.title}
        containerStyle={styles.accountHeader}
      />
      <FlatList
        data={firstHDWalletGroups.data}
        keyExtractor={(item) => `address-${item.id}`}
        renderItem={({ item }) => (
          <NotificationOptionToggle
            key={item.id}
            item={item}
            evmAddress={getEvmAddress(item.accounts)}
            icon={accountAvatarType}
            disabledSwitch={isAnyAccountLoading}
            isLoading={isAccountLoading(item.accounts)}
            isEnabled={isAccountEnabled(item.accounts)}
            refetchNotificationAccounts={refetchAccountSettings}
            testID={NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
              getEvmAddress(item.accounts) ?? '',
            )}
          />
        )}
      />
    </View>
  );
};
