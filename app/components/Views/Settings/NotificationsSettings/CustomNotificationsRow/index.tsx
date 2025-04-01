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

export const CUSTOM_NOTIFICATIONS_ROW_TEST_ID = 'custom-notifications-row';
export const CUSTOM_NOTIFICATIONS_ROW_SWITCH_TEST_ID = (
  testID = CUSTOM_NOTIFICATIONS_ROW_TEST_ID,
) => `${testID}--switch`;

interface CustomNotificationsRowProps {
  title: string;
  description?: string;
  icon: IconName;
  isEnabled: boolean;
  toggleCustomNotificationsEnabled: () => void;
  testID?: string;
}

const CustomNotificationsRow = ({
  title,
  description,
  icon,
  isEnabled,
  toggleCustomNotificationsEnabled,
  testID,
}: CustomNotificationsRowProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  return (
    <View style={styles.container} testID={testID}>
      <Icon
        name={icon}
        style={styles.icon}
        color={IconColor.Default}
        size={IconSize.Lg}
      />
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {title}
        </Text>
        {description && (
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {description}
          </Text>
        )}
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
        testID={CUSTOM_NOTIFICATIONS_ROW_SWITCH_TEST_ID(testID)}
      />
    </View>
  );
};

export default React.memo(CustomNotificationsRow);
