import React from 'react';
import { Switch, View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from '../NotificationOptionToggle/styles';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, { IconColor, IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';

interface CustomNotificationsRowProps {
  title: string;
  description?: string;
  icon: IconName;
  isEnabled: boolean;
  toggleCustomNotificationsEnabled: () => void;
}

const CustomNotificationsRow = ({
  title,
  description,
  icon,
  isEnabled,
  toggleCustomNotificationsEnabled,
}: CustomNotificationsRowProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  return (
    <View style={styles.container}>
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
        {
        description &&
        (<Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {description}
        </Text>)
        }
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
      />
      </View>
  );
};


  export default React.memo(CustomNotificationsRow);
