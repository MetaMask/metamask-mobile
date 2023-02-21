import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
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

const propTypes = {
  style: PropTypes.object,
  isWarning: PropTypes.bool,
  isNotification: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

const defaultProps = {
  style: {},
  isWarning: false,
  isHighlighted: false,
};

const SettingsNotification = ({
  style,
  isWarning,
  isNotification,
  children,
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

SettingsNotification.propTypes = propTypes;
SettingsNotification.defaultProps = defaultProps;

export default SettingsNotification;
