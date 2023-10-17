import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Alert, { AlertType } from '../../../Base/Alert';
import Text from '../../../Base/Text';
import { useTheme } from '../../../../util/theme';
const AlertTypeKeys = Object.keys(AlertType);

const VERTICAL_DISPLACEMENT = 12;
const createStyles = (colors) =>
  StyleSheet.create({
    content: {
      flex: 1,
      alignItems: 'center',
    },
    contentWithAction: {
      marginBottom: 10,
    },
    wrapper: {
      flexDirection: 'column',
      flex: 1,
    },
    action: {
      marginTop: -5,
      marginBottom: -VERTICAL_DISPLACEMENT,
      bottom: -VERTICAL_DISPLACEMENT,
      alignItems: 'center',
    },
    button: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 100,
    },
    warningButton: {
      backgroundColor: colors.warning.default,
    },
    errorButton: {
      backgroundColor: colors.error.default,
    },
    errorButtonText: {
      color: colors.error.inverse,
    },
    infoWrapper: {
      position: 'absolute',
      top: 3,
      right: 3,
    },
    warningInfoIcon: {
      color: colors.warning.default,
    },
    errorInfoIcon: {
      color: colors.error.default,
    },
  });

const getButtonStyle = (type, styles) => {
  switch (type) {
    case AlertType.Error: {
      return styles.errorButton;
    }
    case AlertType.Warning:
    default: {
      return styles.warningButton;
    }
  }
};

const getInfoIconStyle = (type, styles) => {
  switch (type) {
    case AlertType.Error: {
      return styles.errorInfoIcon;
    }
    case AlertType.Warning:
    default: {
      return styles.warningInfoIcon;
    }
  }
};

function Button({ type, onPress, children }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, getButtonStyle(type, styles)]}
    >
      <Text
        small
        bold
        primary
        style={[type === AlertType.Error && styles.errorButtonText]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

Button.propTypes = {
  type: PropTypes.oneOf(AlertTypeKeys),
  onPress: PropTypes.func,
  children: PropTypes.string,
};

function ActionAlert({ type, style, action, onInfoPress, onPress, children }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Alert
      small
      type={type}
      style={[style, Boolean(action) && styles.contentWithAction]}
    >
      {(textStyle) => (
        <>
          <View style={styles.wrapper}>
            <View style={[styles.content]}>{children(textStyle)}</View>
            {Boolean(action) && (
              <View style={[styles.action]}>
                <Button onPress={onPress} type={type}>
                  {action}
                </Button>
              </View>
            )}
          </View>
          {Boolean(onInfoPress) && (
            <TouchableOpacity
              style={styles.infoWrapper}
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
              onPress={onInfoPress}
            >
              <MaterialIcon
                name="info"
                size={16}
                style={getInfoIconStyle(type, styles)}
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </Alert>
  );
}

ActionAlert.propTypes = {
  type: PropTypes.oneOf(AlertTypeKeys),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  onPress: PropTypes.func,
  onInfoPress: PropTypes.func,
  action: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};
export default ActionAlert;
