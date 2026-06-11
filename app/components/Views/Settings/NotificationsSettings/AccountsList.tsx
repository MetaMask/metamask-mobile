import React, { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import type {
  useAccountProps,
  useNotificationAccountListProps,
} from './AccountsList.hooks';
import NotificationOptionToggle from './NotificationOptionToggle';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import AccountListHeader from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListHeader';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';

export type AccountProps = ReturnType<typeof useAccountProps>;
export type NotificationAccountListProps = ReturnType<
  typeof useNotificationAccountListProps
>;

interface AccountsListProps {
  accountProps: AccountProps;
  notificationAccountListProps: NotificationAccountListProps;
}

export const AccountsList = ({
  accountProps,
  notificationAccountListProps,
}: AccountsListProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const { accountAvatarType, accountWalletGroups } = accountProps;
  const {
    shouldDisableSwitches,
    isAccountLoading,
    isAccountEnabled,
    refetchAccountSettings,
    getEvmAddress,
  } = notificationAccountListProps;

  const sections = useMemo(
    () =>
      accountWalletGroups.map((walletGroup) => ({
        key: walletGroup.wallet.id,
        title: walletGroup.title,
        data: walletGroup.data,
      })),
    [accountWalletGroups],
  );

  if (accountWalletGroups.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <AccountListHeader
            title={section.title}
            containerStyle={styles.accountHeader}
          />
        )}
        renderItem={({ item }) => {
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
              disabledSwitch={shouldDisableSwitches}
              isLoading={isAccountLoading(item.accounts)}
              isEnabled={isAccountEnabled(item.accounts)}
              refetchNotificationAccounts={refetchAccountSettings}
              testID={NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
                evmAddress,
              )}
            />
          );
        }}
      />
    </View>
  );
};
