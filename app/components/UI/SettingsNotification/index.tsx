import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../util/theme';
import { Theme } from '@metamask/design-tokens';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    menuItemWarning: {
      flex: 1,
      alignSelf: 'center',
      justifyContent: 'flex-end',
      flexDirection: 'row',
      marginRight: 24,
    },
    wrapper: {
      padding: 12,
      borderRadius: 10,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      marginTop: 10,
    },
    icon: {
      marginRight: 4,
    },
    red: {
      backgroundColor: colors.error.muted,
    },
    normal: {
      backgroundColor: colors.background.alternative,
    },
    check: {
      color: colors.success.default,
    },
  });

const WarningIcon = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Icon
      style={styles.icon}
      size={16}
      color={colors.error.default}
      name="exclamation-triangle"
    />
  );
};
const CheckIcon = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <MaterialIcon
      style={[styles.icon, styles.check]}
      size={16}
      name="check-circle"
    />
  );
};



interface SettingsNotificationProps {
  style?: StyleProp<ViewStyle>;
  isWarning?: boolean;
  isNotification?: boolean;
  children?: React.ReactNode;
  isHighlighted?: boolean;
}



const SettingsNotification: React.FC<SettingsNotificationProps> = ({
  style = {},
  isWarning = false,
  isNotification,
  children,
  isHighlighted = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        isNotification
          ? Object.assign({}, styles.menuItemWarning, style)
          : styles.wrapper,
        isNotification ? null : isWarning ? styles.red : styles.normal,
      ]}
    >
      {isWarning ? <WarningIcon /> : <CheckIcon />}
      {children}
    </View>
  );
};

export default SettingsNotification;
