import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useAccountNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';

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
    isAnyAccountUpdating,
    isAccountEnabled,
    refetchAccountSettings,
    getEvmAddress,
  } = notificationAccountListProps;
  const { onToggle } = useAccountNotificationsToggle();
  const [pendingAccountToggle, setPendingAccountToggle] = useState<{
    address: string;
    value: boolean;
  } | null>(null);
  const isUpdatingAccountRef = useRef(false);
  const areSwitchesDisabled =
    shouldDisableSwitches ||
    isAnyAccountUpdating ||
    pendingAccountToggle !== null;

  const handleToggleAccountNotifications = useCallback(
    async (evmAddress: string, nextValue: boolean) => {
      if (isUpdatingAccountRef.current) {
        return;
      }

      isUpdatingAccountRef.current = true;
      setPendingAccountToggle({ address: evmAddress, value: nextValue });
      try {
        await onToggle([evmAddress], nextValue);
        await refetchAccountSettings();
      } catch {
        // The toggle hook owns user-facing error state; keep this UI responsive.
      } finally {
        isUpdatingAccountRef.current = false;
        setPendingAccountToggle(null);
      }
    },
    [onToggle, refetchAccountSettings],
  );

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
              icon={accountAvatarType}
              disabledSwitch={areSwitchesDisabled}
              isEnabled={
                pendingAccountToggle?.address === evmAddress
                  ? pendingAccountToggle.value
                  : isAccountEnabled(item.accounts)
              }
              onToggle={(nextValue) =>
                handleToggleAccountNotifications(evmAddress, nextValue)
              }
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
