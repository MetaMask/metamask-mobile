import React from 'react';
import { View } from 'react-native';
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

  const { accountAvatarType, accountWalletGroups } = useAccountProps();
  const {
    isAnyAccountLoading,
    isAccountLoading,
    isAccountEnabled,
    refetchAccountSettings,
    getEvmAddress,
  } = useNotificationAccountListProps();

  if (accountWalletGroups.length === 0) {
    return null;
  }

  return (
    <View>
      {accountWalletGroups.map((walletGroup) => (
        <View key={walletGroup.wallet.id}>
          <AccountListHeader
            title={walletGroup.title}
            containerStyle={styles.accountHeader}
          />
          {walletGroup.data.map((item) => {
            const evmAddress = getEvmAddress(item.accounts);
            if (!evmAddress) {
              return null;
            }

            return (
              <NotificationOptionToggle
                key={item.id}
                item={item}
                evmAddress={evmAddress}
                icon={accountAvatarType}
                disabledSwitch={isAnyAccountLoading}
                isLoading={isAccountLoading(item.accounts)}
                isEnabled={isAccountEnabled(item.accounts)}
                refetchNotificationAccounts={refetchAccountSettings}
                testID={NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
                  evmAddress,
                )}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};
