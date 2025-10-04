import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { createStyles } from './styles';
import { useTheme } from '../../../../../util/theme';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { useAccountNotificationsToggle } from '../../../../../util/notifications/hooks/useSwitchNotifications';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import AccountCell from '../../../../../component-library/components-temp/MultichainAccounts/AccountCell';

const NOTIFICATION_OPTIONS_TOGGLE_SWITCH_TEST_ID =
  'notification_options_toggle_switch';
export const NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID = (
  testID = NOTIFICATION_OPTIONS_TOGGLE_SWITCH_TEST_ID,
) => `${testID}:notification_options_toggle--container`;
export const NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID = (
  testID = NOTIFICATION_OPTIONS_TOGGLE_SWITCH_TEST_ID,
) => `${testID}:notification_options_toggle--loading`;

interface NotificationOptionsToggleProps {
  item: AccountGroupObject;
  evmAddress?: string;
  icon: AvatarAccountType;
  testId?: string;
  disabledSwitch?: boolean;
  isLoading?: boolean;
  isEnabled: boolean;
  refetchNotificationAccounts: () => Promise<void>;
  testID: string;
}

export function useUpdateAccountSetting(
  address: string | undefined,
  refetchAccountSettings: () => Promise<void>,
) {
  const { onToggle, error } = useAccountNotificationsToggle();

  // Local states
  const [loading, setLoading] = useState(false);

  const toggleAccount = useCallback(
    async (state: boolean) => {
      if (!address) {
        return;
      }
      setLoading(true);
      try {
        await onToggle([address], state);
        await refetchAccountSettings();
      } catch {
        // Do nothing (we don't need to propagate this)
      }
      setLoading(false);
    },
    [address, onToggle, refetchAccountSettings],
  );

  return { toggleAccount, loading, error };
}

/**
 * View that renders the toggle for notifications options
 * This component assumes that the parent will manage the state of the toggle. This is because most of the state is global.
 */
const NotificationOptionToggle = ({
  item,
  evmAddress,
  icon,
  isEnabled,
  disabledSwitch,
  isLoading,
  refetchNotificationAccounts,
  testID,
}: NotificationOptionsToggleProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();
  const { trackEvent, createEventBuilder } = useMetrics();

  const { toggleAccount, loading: isUpdatingAccount } = useUpdateAccountSetting(
    evmAddress,
    refetchNotificationAccounts,
  );

  const loading = isLoading || isUpdatingAccount;

  const handleToggleAccountNotifications = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'account_notifications',
          old_value: isEnabled,
          new_value: !isEnabled,
        })
        .build(),
    );
    await toggleAccount(!isEnabled);
  }, [isEnabled, toggleAccount, trackEvent, createEventBuilder]);

  return (
    <View testID={NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID(testID)}>
      <AccountCell
        accountGroup={item}
        avatarAccountType={icon}
        isSelected={false}
        endContainer={
          loading ? (
            <ActivityIndicator
              testID={NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID(testID)}
            />
          ) : (
            <Switch
              style={styles.switch}
              value={isEnabled}
              onChange={handleToggleAccountNotifications}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              disabled={disabledSwitch}
              ios_backgroundColor={colors.border.muted}
              testID={testID}
            />
          )
        }
      />
    </View>
  );
};

export default React.memo(NotificationOptionToggle);
