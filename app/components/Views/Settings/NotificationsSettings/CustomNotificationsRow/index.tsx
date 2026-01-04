import React from 'react';
import { Switch, View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from '../NotificationOptionToggle/styles';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

export const NOTIFICATION_SWITCH = 'notifications-switch';
export const CUSTOM_NOTIFICATIONS_ROW_SWITCH_CONTAINER_TEST_ID = (
  testID = NOTIFICATION_SWITCH,
) => `${testID}--container`;

interface CustomNotificationsRowProps {
  title: string;
  icon?: IconName;
  isEnabled: boolean;
  toggleCustomNotificationsEnabled: () => void;
  testID?: string;
}

const CustomNotificationsRow = ({
  title,
  icon,
  isEnabled,
  toggleCustomNotificationsEnabled,
  testID = NOTIFICATION_SWITCH,
}: CustomNotificationsRowProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  return (
    <View
      style={styles.container}
      testID={CUSTOM_NOTIFICATIONS_ROW_SWITCH_CONTAINER_TEST_ID(testID)}
    >
      {icon && (
        <Icon
          name={icon}
          style={styles.icon}
          color={IconColor.Default}
          size={IconSize.Lg}
        />
      )}
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium}>{title}</Text>
      </View>
      <Switch
        value={isEnabled}
        onChange={toggleCustomNotificationsEnabled}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={theme.brandColors.white}
        style={styles.switch}
        ios_backgroundColor={colors.border.muted}
        testID={testID}
      />
    </View>
  );
};

export default React.memo(CustomNotificationsRow);
