import React, { useCallback } from 'react';
import { Switch, View } from 'react-native';
import { createStyles } from './styles';
import { useTheme } from '../../../../../util/theme';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
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
  icon: AvatarAccountType;
  testId?: string;
  disabledSwitch?: boolean;
  isEnabled: boolean;
  onToggle: (nextValue: boolean) => void;
  testID: string;
}

/**
 * View that renders the toggle for notifications options
 * This component assumes that the parent will manage the state of the toggle. This is because most of the state is global.
 */
const NotificationOptionToggle = ({
  item,
  icon,
  isEnabled,
  disabledSwitch,
  onToggle,
  testID,
}: NotificationOptionsToggleProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const handleToggleAccountNotifications = useCallback(
    (nextValue: boolean) => {
      onToggle(nextValue);
    },
    [onToggle],
  );

  return (
    <View testID={NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID(testID)}>
      <AccountCell
        accountGroup={item}
        avatarAccountType={icon}
        endContainer={
          <Switch
            style={styles.switch}
            value={isEnabled}
            onValueChange={handleToggleAccountNotifications}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            disabled={disabledSwitch}
            ios_backgroundColor={colors.border.muted}
            testID={testID}
          />
        }
      />
    </View>
  );
};

export default React.memo(NotificationOptionToggle);
